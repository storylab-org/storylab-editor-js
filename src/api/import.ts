/**
 * Frontend API client for book import (EPUB and CID backups)
 */

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export type ImportFormat = 'epub' | 'car'

interface ImportEpubResponse {
  imported: number
  chapters: Array<{ id: string; name: string; cid: string; createdAt: string; updatedAt: string; order: number }>
}

interface ImportCidResponse {
  imported: number
  skipped: number
  skippedIds: string[]
}

/**
 * Check if running in Tauri desktop app
 */
async function isRunningInTauri(): Promise<boolean> {
  try {
    await invoke('get_server_status')
    return true
  } catch {
    return false
  }
}

/**
 * Open file picker and read file as Uint8Array
 * Returns null if user cancels the dialog
 * Exported for use in components
 */
export async function pickImportFile(format: ImportFormat): Promise<Uint8Array | null> {
  const inTauri = await isRunningInTauri()

  if (inTauri) {
    // Tauri file picker
    const filters =
      format === 'epub'
        ? [
            { name: 'EPUB Books', extensions: ['epub'] },
            { name: 'All Files', extensions: ['*'] },
          ]
        : [
            { name: 'CAR Archives', extensions: ['car', '*'] },
            { name: 'All Files', extensions: ['*'] },
          ]

    const selectedPath = await open({
      filters,
      multiple: false,
      directory: false,
    })

    if (!selectedPath || Array.isArray(selectedPath)) {
      return null
    }

    try {
      const data = await invoke<number[]>('read_file_bytes', { path: selectedPath })
      return new Uint8Array(data)
    } catch (error) {
      console.error('[IMPORT] ✗ Failed to read file:', error)
      throw new Error(`Failed to read file: ${error}`)
    }
  } else {
    // Web file picker
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      // CAR files have no extension (named by CID or custom name), so accept all files
      input.accept = format === 'epub' ? '.epub' : ''

      input.addEventListener('change', async () => {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        try {
          const buffer = await file.arrayBuffer()
          resolve(new Uint8Array(buffer))
        } catch (error) {
          console.error('[IMPORT] ✗ Failed to read file:', error)
          throw new Error(`Failed to read file: ${error}`)
        }
      })

      input.addEventListener('cancel', () => {
        resolve(null)
      })

      input.click()
    })
  }
}

interface ImportOptions {
  replace?: boolean
}

/**
 * Import an EPUB file
 */
export async function importEpub(data: Uint8Array, options?: ImportOptions): Promise<ImportEpubResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
  }
  if (options?.replace) {
    headers['X-Replace'] = 'true'
  }

  const response = await fetch(`${API_BASE}/import/epub`, {
    method: 'POST',
    body: data,
    headers,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`EPUB import failed: ${error || response.statusText}`)
  }

  return response.json()
}

/**
 * Import a CID backup archive
 */
export async function importCid(data: Uint8Array, options?: ImportOptions): Promise<ImportCidResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
  }
  if (options?.replace) {
    headers['X-Replace'] = 'true'
  }

  const response = await fetch(`${API_BASE}/import/car`, {
    method: 'POST',
    body: data,
    headers,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`CAR import failed: ${error || response.statusText}`)
  }

  return response.json()
}

/**
 * Orchestrate import: upload file to server and refresh chapter list
 * If data is not provided, opens file picker first
 */
export async function importAndRefresh(
  format: ImportFormat,
  onRefresh: () => Promise<void>,
  options?: ImportOptions,
  data?: Uint8Array
): Promise<void> {
  try {
    let fileData: Uint8Array | null = data ?? null
    if (!fileData) {
      fileData = await pickImportFile(format)
      if (!fileData) {
        console.log('[IMPORT] ✓ Import cancelled by user')
        return
      }
    }

    if (format === 'epub') {
      const result = await importEpub(fileData, options)
      console.log(`[IMPORT] ✓ Imported ${result.imported} chapter(s)`)
    } else {
      const result = await importCid(fileData, options)
      console.log(`[IMPORT] ✓ Imported ${result.imported} chapter(s), skipped ${result.skipped}`)
      if (result.skipped > 0) {
        console.warn(
          '[IMPORT] ⚠ Some chapters were skipped due to conflicts:',
          result.skippedIds
        )
      }
    }

    await onRefresh()
  } catch (error) {
    console.error('[IMPORT] ✗ Import failed:', error)
    throw error
  }
}
