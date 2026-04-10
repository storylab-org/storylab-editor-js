import { useState, useCallback, useRef } from 'react'
import { OVERVIEW_ID } from '@/constants'
import { exportAndSave, isRunningInTauri, type ExportFormat } from '@/api/export'
import { importAndRefresh, pickImportFile, type ImportFormat } from '@/api/import'
import { listDocuments } from '@/api/documents'

interface UseExportImportReturn {
  exportModalState: { format: string; filename: string } | null
  setExportModalState: (state: { format: string; filename: string } | null) => void
  importPendingFormat: ImportFormat | null
  isImporting: boolean
  handleExport: (format: 'markdown' | 'html' | 'epub' | 'car' | 'pdf') => Promise<void>
  handleExportConfirm: (filename: string) => Promise<void>
  handleImport: (format: ImportFormat) => Promise<void>
  handleImportConfirm: (
    onImportSuccess: (firstChapterId: string | null) => void
  ) => Promise<void>
  handleImportCancel: () => void
}

const defaultExportFilename = (format: string): string => {
  switch (format) {
    case 'markdown':
      return 'book.md'
    case 'html':
      return 'book.html'
    case 'epub':
      return 'book.epub'
    case 'car':
      return '' // CAR filename is determined by the server (manifest CID)
    default:
      return `book.${format}`
  }
}

/**
 * Manages export and import handlers, including modal state and file operations.
 * For imports, the caller must provide an onImportSuccess callback to handle navigation.
 */
export function useExportImport(): UseExportImportReturn {
  const [exportModalState, setExportModalState] = useState<{ format: string; filename: string } | null>(null)
  const [importPendingFormat, setImportPendingFormat] = useState<ImportFormat | null>(null)
  const [importPendingData, setImportPendingData] = useState<Uint8Array | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const contentCacheRef = useRef<Map<string, string>>(new Map())

  const handleExport = useCallback(async (format: 'markdown' | 'html' | 'epub' | 'car' | 'pdf') => {
    if (format === 'pdf') {
      console.log('PDF export not yet implemented')
      return
    }

    try {
      const inTauri = await isRunningInTauri()

      if (inTauri) {
        // Tauri: native save dialog handles filename + path selection
        console.log(`[EXPORT] Starting ${format.toUpperCase()} export (Tauri)...`)
        const filename = defaultExportFilename(format)
        await exportAndSave(format as ExportFormat, filename)
        console.log(`[EXPORT] ✓ ${format.toUpperCase()} export completed`)
      } else {
        // Web: show filename modal before download
        console.log(`[EXPORT] Opening export dialog for ${format}...`)
        const filename = defaultExportFilename(format)
        setExportModalState({ format, filename })
      }
    } catch (error) {
      console.error(`[EXPORT] ✗ Failed to export ${format}:`, error)
    }
  }, [])

  const handleExportConfirm = useCallback(async (filename: string) => {
    if (!exportModalState) return

    try {
      console.log(`[EXPORT] Starting ${exportModalState.format.toUpperCase()} export...`)
      await exportAndSave(exportModalState.format as ExportFormat, filename)
      console.log(`[EXPORT] ✓ ${exportModalState.format.toUpperCase()} export completed`)
    } catch (error) {
      console.error(`[EXPORT] ✗ Failed to export:`, error)
    } finally {
      setExportModalState(null)
    }
  }, [exportModalState])

  const handleImport = useCallback(async (format: ImportFormat) => {
    try {
      console.log(`[IMPORT] Opening file picker for ${format.toUpperCase()}...`)
      const data = await pickImportFile(format)
      if (!data) {
        console.log('[IMPORT] Import cancelled by user')
        return
      }

      console.log(`[IMPORT] File selected (${data.length} bytes). Showing confirmation modal...`)
      setImportPendingFormat(format)
      setImportPendingData(data)
    } catch (error) {
      console.error(`[IMPORT] ✗ Failed to pick file:`, error)
    }
  }, [])

  const handleImportConfirm = useCallback(async (
    onImportSuccess: (firstChapterId: string | null) => void
  ) => {
    if (!importPendingFormat || !importPendingData) return

    setIsImporting(true)
    try {
      console.log(`[IMPORT] Starting ${importPendingFormat.toUpperCase()} import (replace mode)...`)

      // Custom refresh that also navigates to first chapter
      const refreshAndNavigate = async () => {
        try {
          const docs = await listDocuments()

          // Clear content cache to force fresh load
          contentCacheRef.current.clear()

          // Navigate to first chapter, or fallback to draft board
          if (docs.length > 0) {
            console.log(`[IMPORT] ✓ Navigating to first chapter: "${docs[0].name}" (${docs[0].id})`)
            onImportSuccess(docs[0].id)
          } else {
            console.log('[IMPORT] ✓ No chapters imported, navigating to draft board')
            onImportSuccess(OVERVIEW_ID)
          }
        } catch (error) {
          console.error('Failed to refresh chapters after import:', error)
        }
      }

      // Pass the already-picked file data to avoid picking again
      await importAndRefresh(importPendingFormat, refreshAndNavigate, { replace: true }, importPendingData)
      console.log(`[IMPORT] ✓ ${importPendingFormat.toUpperCase()} import completed`)
    } catch (error) {
      console.error(`[IMPORT] ✗ Failed to import ${importPendingFormat}:`, error)
    } finally {
      setIsImporting(false)
      setImportPendingFormat(null)
      setImportPendingData(null)
    }
  }, [importPendingFormat, importPendingData])

  const handleImportCancel = useCallback(() => {
    console.log('[IMPORT] Import cancelled by user')
    setImportPendingFormat(null)
    setImportPendingData(null)
  }, [])

  return {
    exportModalState,
    setExportModalState,
    importPendingFormat,
    isImporting,
    handleExport,
    handleExportConfirm,
    handleImport,
    handleImportConfirm,
    handleImportCancel,
  }
}
