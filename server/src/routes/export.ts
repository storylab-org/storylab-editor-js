import { FastifyPluginAsync } from 'fastify'
import { lexicalToHtml } from '../lexical-to-html.js'
import { lexicalToMarkdown } from '../lexical-to-markdown.js'
import { zip } from 'fflate'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { CarWriter } from '@ipld/car'
import type { Manifest } from '../dag.js'

/**
 * Build an EPUB3 book from all chapters
 */
async function buildEpub(chapters: { name: string; htmlContent: string }[]): Promise<Uint8Array> {
  if (chapters.length === 0) {
    throw new Error('No chapters to export')
  }

  const now = new Date().toISOString()
  const bookTitle = chapters.length === 1 ? chapters[0].name : 'Story'

  // Build chapter files
  const chapterFiles: { [key: string]: Uint8Array } = {}

  chapters.forEach((chapter, idx) => {
    const chapterNum = idx + 1
    const xhtmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <title>${escapeXml(chapter.name)}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <h1>${escapeXml(chapter.name)}</h1>
    ${chapter.htmlContent}
  </body>
</html>`
    const filename = `OEBPS/chapter-${chapterNum}.xhtml`
    chapterFiles[filename] = new TextEncoder().encode(xhtmlContent)
  })

  // Build manifest entries
  const manifestItems = chapters
    .map(
      (chapter, idx) =>
        `    <item id="chapter-${idx + 1}" href="chapter-${idx + 1}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join('\n')

  const spineItems = chapters.map((_, idx) => `    <itemref idref="chapter-${idx + 1}"/>`).join('\n')

  const tocEntries = chapters
    .map(
      (chapter, idx) =>
        `      <navPoint id="navpoint-${idx + 1}" playOrder="${idx + 1}">
        <navLabel><text>${escapeXml(chapter.name)}</text></navLabel>
        <content src="chapter-${idx + 1}.xhtml"/>
      </navPoint>`
    )
    .join('\n')

  const navEntries = chapters
    .map(
      (chapter, idx) =>
        `      <li><a href="chapter-${idx + 1}.xhtml">${escapeXml(chapter.name)}</a></li>`
    )
    .join('\n')

  // OPF package document
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}</dc:identifier>
    <dc:title>${escapeXml(bookTitle)}</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`

  // NCX (EPUB2 compatibility)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(bookTitle)}</text></docTitle>
  <navMap>
${tocEntries}
  </navMap>
</ncx>`

  // EPUB3 Nav document
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
  <head>
    <title>Table of Contents</title>
  </head>
  <body>
    <nav epub:type="toc">
      <h1>Table of Contents</h1>
      <ol>
${navEntries}
      </ol>
    </nav>
  </body>
</html>`

  // Container.xml
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

  // CSS
  const styleCss = `body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  margin: 1em;
  max-width: 800px;
  color: #333;
}
h1, h2, h3 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: bold;
}
h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.2em; }
p { margin: 1em 0; }
blockquote {
  border-left: 3px solid #ccc;
  padding-left: 1em;
  margin: 1em 0;
  font-style: italic;
  color: #666;
}
code {
  background: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}
pre {
  background: #f4f4f4;
  padding: 1em;
  border-radius: 3px;
  overflow-x: auto;
}
pre code {
  background: none;
  padding: 0;
}
ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}
li {
  margin: 0.5em 0;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}
th, td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}
th {
  background: #f4f4f4;
  font-weight: bold;
}`

  // Build file structure
  const files: { [key: string]: Uint8Array } = {
    mimetype: new TextEncoder().encode('application/epub+zip'),
    'META-INF/container.xml': new TextEncoder().encode(containerXml),
    'OEBPS/content.opf': new TextEncoder().encode(contentOpf),
    'OEBPS/toc.ncx': new TextEncoder().encode(tocNcx),
    'OEBPS/nav.xhtml': new TextEncoder().encode(navXhtml),
    'OEBPS/style.css': new TextEncoder().encode(styleCss),
    ...chapterFiles,
  }

  // Compress to ZIP with fflate
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, zipped) => {
      if (err) {
        reject(err)
      } else {
        resolve(zipped)
      }
    })
  })
}

/**
 * Escape XML entities
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Compute CIDv1 from raw bytes using sha2-256 and raw codec
 */
async function computeCid(bytes: Uint8Array): Promise<CID> {
  const hash = await sha256.digest(bytes)
  return CID.create(1, raw.code, hash)
}

/**
 * Build CAR file bytes from blocks
 * Handles CarWriter backpressure by draining output concurrently
 */
async function buildCar(rootCid: CID, blocks: Array<{ cid: CID; bytes: Uint8Array }>): Promise<Uint8Array> {
  const { writer, out } = await CarWriter.create([rootCid])

  // Collect output concurrently (must not deadlock by awaiting put() first)
  const collectPromise = (async () => {
    const chunks: Uint8Array[] = []
    for await (const chunk of out) {
      chunks.push(chunk)
    }
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const result = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      result.set(c, offset)
      offset += c.length
    }
    return result
  })()

  // Drive the writer
  for (const block of blocks) {
    await writer.put(block)
  }
  await writer.close()

  return collectPromise
}

/**
 * Export routes
 */
const exportRoute: FastifyPluginAsync = async (fastify) => {
  // GET /export/epub - Export all documents as EPUB
  fastify.get<{ Reply: Buffer | string }>('/export/epub', async (request, reply) => {
    request.log.debug('starting EPUB export')

    try {
      const documents = await fastify.documentStore.list()
      if (documents.length === 0) {
        return reply.status(400).send('No documents to export')
      }

      const chapters = await Promise.all(
        documents.map(async (doc) => {
          const resolved = await fastify.documentStore.get(doc.id)
          const htmlContent = lexicalToHtml(resolved.content)
          return {
            name: resolved.name,
            htmlContent,
          }
        })
      )

      const epubBuffer = await buildEpub(chapters)
      request.log.info({ documentCount: documents.length }, 'EPUB built successfully')

      reply.type('application/epub+zip')
      reply.header('Content-Disposition', 'attachment; filename="book.epub"')
      return Buffer.from(epubBuffer)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      request.log.error({ error: message }, 'EPUB export failed')
      return reply.status(500).send('Failed to build EPUB')
    }
  })

  // GET /export/html - Export all documents as single HTML file
  fastify.get<{ Reply: string }>('/export/html', async (request, reply) => {
    request.log.debug('starting HTML export')

    try {
      const documents = await fastify.documentStore.list()
      if (documents.length === 0) {
        return reply.status(400).send('No documents to export')
      }

      const bookTitle = documents.length === 1 ? documents[0].name : 'Story'

      const toc = documents
        .map((doc, idx) => `      <li><a href="#chapter-${idx + 1}">${escapeXml(doc.name)}</a></li>`)
        .join('\n')

      const chapters = await Promise.all(
        documents.map(async (doc, idx) => {
          const resolved = await fastify.documentStore.get(doc.id)
          const htmlContent = lexicalToHtml(resolved.content)
          return `    <section id="chapter-${idx + 1}">
      <h1>${escapeXml(resolved.name)}</h1>
      ${htmlContent}
    </section>`
        })
      )

      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${escapeXml(bookTitle)}</title>
    <style>
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        margin: 2em;
        max-width: 900px;
        margin-left: auto;
        margin-right: auto;
        color: #333;
      }
      h1 { font-size: 2em; margin-top: 1.5em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.2em; }
      p { margin: 1em 0; }
      blockquote {
        border-left: 3px solid #ccc;
        padding-left: 1em;
        margin: 1em 0;
        font-style: italic;
        color: #666;
      }
      code {
        background: #f4f4f4;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
      }
      pre {
        background: #f4f4f4;
        padding: 1em;
        border-radius: 3px;
        overflow-x: auto;
      }
      ul, ol {
        margin: 1em 0;
        padding-left: 2em;
      }
      section {
        margin: 3em 0;
        padding-bottom: 2em;
        border-bottom: 1px solid #eee;
      }
      nav {
        margin-bottom: 3em;
        background: #f9f9f9;
        padding: 1em;
        border-radius: 5px;
      }
      nav h2 { margin-top: 0; }
    </style>
  </head>
  <body>
    <h1>${escapeXml(bookTitle)}</h1>
    <nav>
      <h2>Table of Contents</h2>
      <ol>
${toc}
      </ol>
    </nav>
${chapters.join('\n')}
  </body>
</html>`

      request.log.info({ documentCount: documents.length }, 'HTML export completed')
      reply.type('text/html')
      reply.header('Content-Disposition', 'attachment; filename="book.html"')
      return html
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      request.log.error({ error: message }, 'HTML export failed')
      return reply.status(500).send('Failed to export HTML')
    }
  })

  // GET /export/markdown - Export all documents as Markdown
  fastify.get<{ Reply: string }>('/export/markdown', async (request, reply) => {
    request.log.debug('starting Markdown export')

    try {
      const documents = await fastify.documentStore.list()
      if (documents.length === 0) {
        return reply.status(400).send('No documents to export')
      }

      const chapters = await Promise.all(
        documents.map(async (doc) => {
          const resolved = await fastify.documentStore.get(doc.id)
          const markdown = lexicalToMarkdown(resolved.content)
          return `# ${resolved.name}\n\n${markdown}`
        })
      )

      const markdown = chapters.join('\n\n---\n\n')

      request.log.info({ documentCount: documents.length }, 'Markdown export completed')
      reply.type('text/markdown')
      reply.header('Content-Disposition', 'attachment; filename="book.md"')
      return markdown
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      request.log.error({ error: message }, 'Markdown export failed')
      return reply.status(500).send('Failed to export Markdown')
    }
  })

  // GET /export/car - Export all documents as CAR (Content Addressable aRchive)
  fastify.get<{ Reply: Buffer | string }>('/export/car', async (request, reply) => {
    request.log.debug('starting CAR export')

    try {
      // 1. Fetch all documents
      const documents = await fastify.documentStore.list()

      // 2. Collect all blocks to include in CAR
      const blocks: Array<{ cid: CID; bytes: Uint8Array }> = []

      // 3. Encode chapter content and compute CIDv1 for each
      const chapterCids: { id: string; cidV1: string }[] = []
      for (const doc of documents) {
        const contentBytes = await fastify.blockstore.get(doc.cid)
        const cidV1 = await computeCid(contentBytes)
        blocks.push({ cid: cidV1, bytes: contentBytes })
        chapterCids.push({ id: doc.id, cidV1: cidV1.toString() })
      }

      // 4. Encode state files and compute CIDv1 for each
      const entitiesBytes = new TextEncoder().encode(JSON.stringify(fastify.entityStore.list(), null, 2))
      const entitiesCid = await computeCid(entitiesBytes)
      blocks.push({ cid: entitiesCid, bytes: entitiesBytes })

      const annotationsBytes = new TextEncoder().encode(JSON.stringify(fastify.annotationStore.list(), null, 2))
      const annotationsCid = await computeCid(annotationsBytes)
      blocks.push({ cid: annotationsCid, bytes: annotationsBytes })

      const overviewBytes = new TextEncoder().encode(JSON.stringify(await fastify.overviewStore.getOverview(), null, 2))
      const overviewCid = await computeCid(overviewBytes)
      blocks.push({ cid: overviewCid, bytes: overviewBytes })

      const boardBytes = new TextEncoder().encode(JSON.stringify(await fastify.overviewStore.getBoard(), null, 2))
      const boardCid = await computeCid(boardBytes)
      blocks.push({ cid: boardCid, bytes: boardBytes })

      const pathsBytes = new TextEncoder().encode(JSON.stringify(await fastify.overviewStore.listPaths(), null, 2))
      const pathsCid = await computeCid(pathsBytes)
      blocks.push({ cid: pathsCid, bytes: pathsBytes })

      // 5. Fetch and encode image data
      const images = await fastify.imageStore.listAll()
      const imageBlocks: Array<{ cid: string; mimeType: string }> = []
      for (const { cid: imageCidHex, mimeType } of images) {
        const imageBytes = await fastify.blockstore.get(imageCidHex)
        const imageCidV1 = await computeCid(imageBytes)
        blocks.push({ cid: imageCidV1, bytes: imageBytes })
        imageBlocks.push({ cid: imageCidV1.toString(), mimeType })
      }

      // 6. Build manifest v2 with CIDv1 references
      const manifest: Manifest = {
        version: '2',
        title: documents.length === 1 ? documents[0].name : 'Story',
        chapters: documents.map((doc, idx) => ({
          id: doc.id,
          name: doc.name,
          cid: chapterCids[idx].cidV1,
          order: idx,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })),
        entitiesCid: entitiesCid.toString(),
        annotationsCid: annotationsCid.toString(),
        overviewCid: overviewCid.toString(),
        boardCid: boardCid.toString(),
        pathsCid: pathsCid.toString(),
        images: imageBlocks,
        createdAt: new Date().toISOString(),
      }

      // 7. Encode manifest and compute its CIDv1
      const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2))
      const manifestCid = await computeCid(manifestBytes)

      // 8. Prepend manifest block to the block array (CAR standard: root first)
      blocks.unshift({ cid: manifestCid, bytes: manifestBytes })

      // 9. Build CAR file
      const carBytes = await buildCar(manifestCid, blocks)

      // 10. Log and respond
      request.log.info(
        { documentCount: documents.length, blockCount: blocks.length, imageCount: images.length, manifestCid: manifestCid.toString() },
        'CAR export completed'
      )

      const filename = `${manifestCid.toString()}.car`
      reply.type('application/octet-stream')
      reply.header('X-Manifest-CID', manifestCid.toString())
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      return Buffer.from(carBytes)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      request.log.error({ error: message }, 'CAR export failed')
      return reply.status(500).send('Failed to export CAR')
    }
  })
}

export default exportRoute
