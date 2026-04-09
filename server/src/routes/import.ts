import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { unzipSync, strFromU8 } from 'fflate'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { htmlToLexical } from '../html-to-lexical.js'
import { parseEpub } from '../epub-parser.js'
import { CarReader } from '@ipld/car'
import type { DocumentHead } from '../document-store.js'
import type { Manifest } from '../dag.js'

const importRoute: FastifyPluginAsync = async (fastify) => {
  // Register raw binary content-type parser for application/octet-stream
  fastify.addContentTypeParser('application/octet-stream', async (request: any, payload: any) => {
    const chunks: Uint8Array[] = []
    for await (const chunk of payload) {
      chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk))
    }
    const combined = new Uint8Array(
      chunks.reduce((total: number, chunk: Uint8Array) => total + chunk.length, 0)
    )
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    return combined
  })

  /**
   * POST /import/epub
   * Import an EPUB file and create chapters from it
   * Headers:
   *   - X-Replace: true - delete all existing documents before importing
   */
  fastify.post<{ Body: Uint8Array }>(
    '/import/epub',
    async (request: FastifyRequest<{ Body: Uint8Array }>, reply) => {
      try {
        const data = request.body as Uint8Array
        const shouldReplace = request.headers['x-replace'] === 'true'

        // Delete all existing documents if replace=true
        if (shouldReplace) {
          const existing = await fastify.documentStore.list()
          for (const doc of existing) {
            try {
              await fastify.documentStore.remove(doc.id)
              request.log.info(`[IMPORT] Deleted chapter: "${doc.name}" (${doc.id})`)
            } catch (error) {
              request.log.warn(`[IMPORT] Failed to delete chapter ${doc.id}: ${error}`)
            }
          }
        }

        // Parse EPUB
        const chapters = parseEpub(data)

        if (chapters.length === 0) {
          return reply.code(400).send({ error: 'EPUB contains no chapters' })
        }

        // Create documents for each chapter
        const createdChapters: DocumentHead[] = []

        for (const chapter of chapters) {
          try {
            // Convert XHTML to Lexical JSON
            const lexicalJson = htmlToLexical(chapter.xhtmlBody)

            // Create document
            const head = await fastify.documentStore.create(chapter.name, lexicalJson)
            createdChapters.push(head)

            request.log.info(`[IMPORT] Created chapter: "${chapter.name}" (${head.id})`)
          } catch (error) {
            request.log.error(`[IMPORT] Failed to create chapter "${chapter.name}": ${error}`)
            throw error
          }
        }

        reply.code(201).send({
          imported: createdChapters.length,
          chapters: createdChapters,
        })
      } catch (error) {
        request.log.error(`[IMPORT] EPUB import failed: ${error}`)
        reply.code(400).send({ error: `EPUB import failed: ${error}` })
      }
    }
  )

  /**
   * POST /import/car
   * Import a CAR (Content Addressable aRchive) backup and restore full project state
   * Restores: documents, images, entities, annotations, draft board, overview
   * Headers:
   *   - X-Replace: true - delete all existing state before importing
   */
  fastify.post<{ Body: Uint8Array }>(
    '/import/car',
    async (request: FastifyRequest<{ Body: Uint8Array }>, reply) => {
      try {
        const data = request.body as Uint8Array
        const shouldReplace = request.headers['x-replace'] === 'true'
        const dataDir = process.env.STORYLAB_DATA_DIR ?? join(homedir(), '.storylab')

        // 1. Parse CAR file
        let reader
        try {
          reader = await CarReader.fromBytes(data)
        } catch (error) {
          return reply.code(400).send({ error: `Failed to parse CAR file: ${error}` })
        }

        // 2. Get root CID (should be the manifest)
        const roots = await reader.getRoots()
        if (roots.length === 0) {
          return reply.code(400).send({ error: 'CAR file has no root CID' })
        }

        // 3. Build a map of all blocks by CID string
        const blockMap = new Map<string, Uint8Array>()
        try {
          for await (const { cid, bytes } of reader.blocks()) {
            blockMap.set(cid.toString(), bytes)
          }
        } catch (error) {
          return reply.code(400).send({ error: `Failed to read CAR blocks: ${error}` })
        }

        // 4. Read and parse the manifest
        const manifestCidStr = roots[0].toString()
        const manifestBytes = blockMap.get(manifestCidStr)
        if (!manifestBytes) {
          return reply.code(400).send({ error: 'Manifest block not found in CAR' })
        }

        let manifest: Manifest
        try {
          const manifestJson = new TextDecoder().decode(manifestBytes)
          manifest = JSON.parse(manifestJson) as Manifest
        } catch (error) {
          return reply.code(400).send({ error: `Failed to parse manifest: ${error}` })
        }

        // 5. Validate manifest version
        if (manifest.version !== '2') {
          return reply.code(400).send({ error: `Unsupported manifest version: ${manifest.version}. Expected version 2.` })
        }

        // 6. Delete all existing state if replace=true
        if (shouldReplace) {
          const existing = await fastify.documentStore.list()
          for (const doc of existing) {
            try {
              await fastify.documentStore.remove(doc.id)
              request.log.info(`[IMPORT] Deleted chapter: "${doc.name}" (${doc.id})`)
            } catch (error) {
              request.log.warn(`[IMPORT] Failed to delete chapter ${doc.id}: ${error}`)
            }
          }

          // Clear state files with empty content
          await mkdir(dataDir, { recursive: true })
          await writeFile(join(dataDir, 'entities.json'), '[]', 'utf-8')
          await writeFile(join(dataDir, 'annotations.json'), '[]', 'utf-8')
          await writeFile(
            join(dataDir, 'board.json'),
            JSON.stringify({ cards: [], updatedAt: new Date().toISOString() }),
            'utf-8'
          )
          await writeFile(join(dataDir, 'paths.json'), '[]', 'utf-8')
          await writeFile(
            join(dataDir, 'overview.json'),
            JSON.stringify({ content: '', updatedAt: new Date().toISOString() }),
            'utf-8'
          )
          request.log.info('[IMPORT] Cleared existing state files')
        }

        let importedCount = 0
        let skippedCount = 0
        const skippedIds: string[] = []

        // 7. Restore chapters
        for (const chapterRef of manifest.chapters) {
          try {
            const chapterBytes = blockMap.get(chapterRef.cid)
            if (!chapterBytes) {
              request.log.warn(`[IMPORT] Chapter block not found: ${chapterRef.cid}`)
              continue
            }

            // Store block in blockstore (returns hex CID)
            const hexCid = await fastify.blockstore.put(chapterBytes)

            // Build document head from chapter ref
            const head: DocumentHead = {
              id: chapterRef.id,
              name: chapterRef.name,
              cid: hexCid,
              order: chapterRef.order,
              createdAt: chapterRef.createdAt,
              updatedAt: chapterRef.updatedAt,
            }

            try {
              await fastify.documentStore.writeHeadDirect(head)
              importedCount++
              request.log.info(`[IMPORT] Imported chapter: "${head.name}" (${head.id})`)
            } catch (error) {
              if (!shouldReplace && String(error).includes('already exists')) {
                skippedCount++
                skippedIds.push(head.id)
                request.log.info(`[IMPORT] Skipped chapter (conflict): "${head.name}" (${head.id})`)
              } else {
                throw error
              }
            }
          } catch (error) {
            request.log.error(`[IMPORT] Failed to import chapter ${chapterRef.id}: ${error}`)
          }
        }

        // 8. Restore state files
        await mkdir(dataDir, { recursive: true })

        if (manifest.entitiesCid) {
          try {
            const entitiesBytes = blockMap.get(manifest.entitiesCid)
            if (entitiesBytes) {
              const entitiesJson = new TextDecoder().decode(entitiesBytes)
              await writeFile(join(dataDir, 'entities.json'), entitiesJson, 'utf-8')
              request.log.info('[IMPORT] Restored entities.json')
            }
          } catch (error) {
            request.log.warn(`[IMPORT] Failed to restore entities: ${error}`)
          }
        }

        if (manifest.annotationsCid) {
          try {
            const annotationsBytes = blockMap.get(manifest.annotationsCid)
            if (annotationsBytes) {
              const annotationsJson = new TextDecoder().decode(annotationsBytes)
              await writeFile(join(dataDir, 'annotations.json'), annotationsJson, 'utf-8')
              request.log.info('[IMPORT] Restored annotations.json')
            }
          } catch (error) {
            request.log.warn(`[IMPORT] Failed to restore annotations: ${error}`)
          }
        }

        if (manifest.overviewCid) {
          try {
            const overviewBytes = blockMap.get(manifest.overviewCid)
            if (overviewBytes) {
              const overviewJson = new TextDecoder().decode(overviewBytes)
              await writeFile(join(dataDir, 'overview.json'), overviewJson, 'utf-8')
              request.log.info('[IMPORT] Restored overview.json')
            }
          } catch (error) {
            request.log.warn(`[IMPORT] Failed to restore overview: ${error}`)
          }
        }

        if (manifest.boardCid) {
          try {
            const boardBytes = blockMap.get(manifest.boardCid)
            if (boardBytes) {
              const boardJson = new TextDecoder().decode(boardBytes)
              await writeFile(join(dataDir, 'board.json'), boardJson, 'utf-8')
              request.log.info('[IMPORT] Restored board.json')
            }
          } catch (error) {
            request.log.warn(`[IMPORT] Failed to restore board: ${error}`)
          }
        }

        if (manifest.pathsCid) {
          try {
            const pathsBytes = blockMap.get(manifest.pathsCid)
            if (pathsBytes) {
              const pathsJson = new TextDecoder().decode(pathsBytes)
              await writeFile(join(dataDir, 'paths.json'), pathsJson, 'utf-8')
              request.log.info('[IMPORT] Restored paths.json')
            }
          } catch (error) {
            request.log.warn(`[IMPORT] Failed to restore paths: ${error}`)
          }
        }

        // 9. Restore images
        let imageCount = 0
        await mkdir(join(dataDir, 'image-meta'), { recursive: true })
        for (const image of manifest.images) {
          try {
            const imageBytes = blockMap.get(image.cid)
            if (!imageBytes) {
              request.log.warn(`[IMPORT] Image block not found: ${image.cid}`)
              continue
            }

            // Store image block in blockstore (returns hex CID)
            const hexCid = await fastify.blockstore.put(imageBytes)

            // Write image metadata
            const metaJson = JSON.stringify({ mimeType: image.mimeType }, null, 2)
            await writeFile(join(dataDir, 'image-meta', `${hexCid}.json`), metaJson, 'utf-8')
            imageCount++
            request.log.info(`[IMPORT] Restored image: ${hexCid}`)
          } catch (error) {
            request.log.warn(`[IMPORT] Failed to restore image ${image.cid}: ${error}`)
          }
        }

        request.log.info(
          {
            chapters: importedCount,
            blockCount: blockMap.size,
            images: imageCount,
            skipped: skippedCount,
          },
          'CAR import completed'
        )

        reply.code(200).send({
          imported: importedCount,
          skipped: skippedCount,
          skippedIds,
        })
      } catch (error) {
        request.log.error(`[IMPORT] CAR import failed: ${error}`)
        reply.code(400).send({ error: `CAR import failed: ${error}` })
      }
    }
  )
}

export default importRoute
