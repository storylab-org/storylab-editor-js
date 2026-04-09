import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Blockstore, CID } from './blockstore.js'

export interface DocumentHead {
  id: string
  name: string
  cid: string
  createdAt: string
  updatedAt: string
  order: number
}

export interface ResolvedDocument extends DocumentHead {
  content: string
}

export interface DocumentStore {
  list(): Promise<DocumentHead[]>
  get(id: string): Promise<ResolvedDocument>
  create(name: string, content: string): Promise<DocumentHead>
  update(id: string, content: string, name?: string): Promise<DocumentHead>
  remove(id: string): Promise<void>
  reorderDocuments(orderedIds: string[]): Promise<void>
  writeHeadDirect(head: DocumentHead): Promise<void>
}

export function createDocumentStore(blockstore: Blockstore, headsRoot?: string): DocumentStore {
  const root = headsRoot ?? join(homedir(), '.storylab', 'heads')

  const list = async (): Promise<DocumentHead[]> => {
    await mkdir(root, { recursive: true })

    let files: string[] = []
    try {
      const { readdir } = await import('node:fs/promises')
      files = await readdir(root)
    } catch {
      // Directory might not exist yet
      return []
    }

    const heads: DocumentHead[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue

      try {
        const path = join(root, file)
        const data = await readFile(path, 'utf-8')
        const head = JSON.parse(data) as DocumentHead

        // Migration: if document lacks order, use createdAt timestamp as order
        if (head.order === undefined) {
          head.order = new Date(head.createdAt).getTime()
          await saveHead(head)
        }

        heads.push(head)
      } catch {
        // Skip corrupted files
        continue
      }
    }

    // Sort by order ascending
    return heads.sort((a, b) => a.order - b.order)
  }

  const getHead = async (id: string): Promise<DocumentHead | null> => {
    const path = join(root, `${id}.json`)
    try {
      const data = await readFile(path, 'utf-8')
      return JSON.parse(data) as DocumentHead
    } catch {
      return null
    }
  }

  const saveHead = async (head: DocumentHead): Promise<void> => {
    await mkdir(root, { recursive: true })
    const path = join(root, `${head.id}.json`)
    await writeFile(path, JSON.stringify(head, null, 2), 'utf-8')
  }

  const get = async (id: string): Promise<ResolvedDocument> => {
    const head = await getHead(id)
    if (!head) {
      throw new Error(`Document not found`)
    }

    const blockData = await blockstore.get(head.cid as CID)
    const content = Buffer.from(blockData).toString('utf-8')

    return {
      ...head,
      content
    }
  }

  const create = async (name: string, content: string): Promise<DocumentHead> => {
    const id = randomUUID()
    const blockData = new TextEncoder().encode(content)
    const cid = await blockstore.put(blockData)
    const now = new Date().toISOString()

    const head: DocumentHead = {
      id,
      name,
      cid,
      createdAt: now,
      updatedAt: now,
      order: Date.now()
    }

    await saveHead(head)
    return head
  }

  const update = async (id: string, content: string, name?: string): Promise<DocumentHead> => {
    const head = await getHead(id)
    if (!head) {
      throw new Error(`Document not found`)
    }

    const blockData = new TextEncoder().encode(content)
    const cic = await blockstore.put(blockData)
    const now = new Date().toISOString()

    const updated: DocumentHead = {
      ...head,
      cid: cic,
      name: name ?? head.name,
      updatedAt: now
    }

    await saveHead(updated)
    return updated
  }

  const remove = async (id: string): Promise<void> => {
    const head = await getHead(id)
    if (!head) {
      throw new Error(`Document not found`)
    }

    const path = join(root, `${id}.json`)
    await unlink(path)
  }

  const reorderDocuments = async (orderedIds: string[]): Promise<void> => {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]
      const head = await getHead(id)
      if (!head) {
        throw new Error(`Document ${id} not found`)
      }

      head.order = i
      await saveHead(head)
    }
  }

  const writeHeadDirect = async (head: DocumentHead): Promise<void> => {
    // Check if a head with this ID already exists
    const existing = await getHead(head.id)
    if (existing) {
      throw new Error(`Document with ID "${head.id}" already exists`)
    }
    // Write the head file directly, preserving UUID, CID, and timestamps
    await saveHead(head)
  }

  return {
    list,
    get,
    create,
    update,
    remove,
    reorderDocuments,
    writeHeadDirect
  }
}
