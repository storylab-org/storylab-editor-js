/**
 * Frontend API client for book export
 */

import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export type ExportFormat = 'markdown' | 'html' | 'epub' | 'car'

/**
 * Check if running in Tauri desktop app
 */
export async function isRunningInTauri(): Promise<boolean> {
  try {
    await invoke('get_server_status')
    return true
  } catch {
    return false
  }
}

/**
 * Fetch exported book in the specified format
 * Returns both the blob and optional manifest CID (for CID exports)
 */
export async function exportBook(format: ExportFormat): Promise<{ blob: Blob; manifestCid?: string }> {
  const response = await fetch(`${API_BASE}/export/${format}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}: ${response.statusText}`)
  }

  const blob = await response.blob()
  const manifestCid = response.headers.get('X-Manifest-CID') ?? undefined

  return { blob, manifestCid }
}

/**
 * Trigger a browser download of a blob (web only)
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Save exported file in Tauri desktop app with file dialog
 */
async function saveExportFileInTauri(blob: Blob, filename: string): Promise<void> {
  const buffer = await blob.arrayBuffer()
  const data = Array.from(new Uint8Array(buffer))

  try {
    // Determine file extension for the filter
    const ext = filename.includes('.') ? filename.split('.').pop() : null

    // Build filters: if file has extension, show it as first option
    const filters = ext
      ? [
          {
            name: `${ext.toUpperCase()} files`,
            extensions: [ext],
          },
          {
            name: 'All files',
            extensions: ['*'],
          },
        ]
      : [
          {
            name: 'All files',
            extensions: ['*'],
          },
        ]

    // Show save dialog
    const selectedPath = await save({
      defaultPath: filename,
      filters,
    })

    // User cancelled the dialog
    if (!selectedPath) {
      console.log('[EXPORT] ✗ Export cancelled by user')
      return
    }

    const savedPath = await invoke<string>('save_export_file', {
      filename: selectedPath,
      data,
    })
    console.log(`[EXPORT] ✓ File saved to: ${savedPath}`)
  } catch (error) {
    console.error(`[EXPORT] ✗ Failed to save file in Tauri:`, error)
    throw new Error(`Failed to save export file: ${error}`)
  }
}

/**
 * Export and save file - handles both web and Tauri platforms
 * For CAR exports, the filename is the manifest CID from the server
 */
export async function exportAndSave(format: ExportFormat, filename: string): Promise<void> {
  try {
    const inTauri = await isRunningInTauri()

    const { blob, manifestCid } = await exportBook(format)

    // For CAR format, use the manifest CID as the filename
    const effectiveFilename = (format === 'car' && manifestCid) ? manifestCid : filename

    if (inTauri) {
      await saveExportFileInTauri(blob, effectiveFilename)
    } else {
      triggerDownload(blob, effectiveFilename)
    }
  } catch (error) {
    console.error(`[EXPORT] ✗ Export failed:`, error)
    throw error
  }
}
