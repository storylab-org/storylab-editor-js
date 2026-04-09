import { Blockstore, CID } from './blockstore.js'
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface ImageStore {
  put(data: Uint8Array, mimeType: string): Promise<CID>
  getMeta(cid: CID): Promise<{ mimeType: string }>
  getData(cid: CID): Promise<Uint8Array>
  has(cid: CID): Promise<boolean>
  listAll(): Promise<Array<{ cid: CID; mimeType: string }>>
}

export function createImageStore(blockstore: Blockstore, imageMetaRoot: string): ImageStore {
  const put = async (data: Uint8Array, mimeType: string): Promise<CID> => {
    const cid = await blockstore.put(data)

    // Write metadata file
    const metaPath = join(imageMetaRoot, `${cid}.json`)
    const metadata = { mimeType }
    await writeFile(metaPath, JSON.stringify(metadata))

    return cid
  }

  const getMeta = async (cid: CID): Promise<{ mimeType: string }> => {
    const metaPath = join(imageMetaRoot, `${cid}.json`)
    const data = await readFile(metaPath, 'utf-8')
    return JSON.parse(data)
  }

  const getData = async (cid: CID): Promise<Uint8Array> => {
    return blockstore.get(cid)
  }

  const has = async (cid: CID): Promise<boolean> => {
    return blockstore.has(cid)
  }

  const listAll = async (): Promise<Array<{ cid: CID; mimeType: string }>> => {
    try {
      const files = await readdir(imageMetaRoot)
      const result: Array<{ cid: CID; mimeType: string }> = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const cid = file.slice(0, -5) as CID // Remove .json extension
          const metaPath = join(imageMetaRoot, file)
          const data = await readFile(metaPath, 'utf-8')
          const metadata = JSON.parse(data)

          result.push({ cid, mimeType: metadata.mimeType })
        } catch (error) {
          // Skip corrupted metadata files
          continue
        }
      }

      return result
    } catch (error) {
      // Directory doesn't exist or can't be read; return empty array
      return []
    }
  }

  return {
    put,
    getMeta,
    getData,
    has,
    listAll,
  }
}
