import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import type { ExportFormat } from '@/api/export'
import type { ImportFormat } from '@/api/import'

interface TauriMenuEventCallbacks {
  onExport: (format: ExportFormat) => Promise<void>
  onImport: (format: ImportFormat) => Promise<void>
  onNewChapter: () => Promise<void>
  onFindReplace: () => void
  onDraftBoard: () => void
  onHelp: () => void
}

/**
 * Listens for Tauri menu events and dispatches to callbacks.
 * Uses refs to avoid stale closures in the event listener.
 */
export function useTauriMenuEvents(callbacks: TauriMenuEventCallbacks): void {
  const callbacksRef = useRef(callbacks)

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    let unlisten: (() => void) | null = null

    listen<string>('menu-event', (event) => {
      const action = event.payload
      if (action.startsWith('export:')) {
        const format = action.replace('export:', '') as ExportFormat
        callbacksRef.current.onExport(format)
      } else if (action.startsWith('import:')) {
        const format = action.replace('import:', '') as ImportFormat
        callbacksRef.current.onImport(format)
      } else if (action === 'action:new-chapter') {
        callbacksRef.current.onNewChapter()
      } else if (action === 'action:undo') {
        // Lexical handles undo via keyboard shortcut, menu item is informational
        console.log('[MENU] Undo triggered (use Cmd+Z shortcut for editor undo)')
      } else if (action === 'action:redo') {
        // Lexical handles redo via keyboard shortcut, menu item is informational
        console.log('[MENU] Redo triggered (use Cmd+Shift+Z shortcut for editor redo)')
      } else if (action === 'action:find-replace') {
        // Open find and replace with Cmd+F equivalent
        const findReplaceEvent = new KeyboardEvent('keydown', {
          key: 'f',
          code: 'KeyF',
          ctrlKey: false,
          metaKey: true,
          bubbles: true,
        })
        document.dispatchEvent(findReplaceEvent)
        callbacksRef.current.onFindReplace()
      } else if (action === 'action:view-draft-board') {
        callbacksRef.current.onDraftBoard()
      } else if (action === 'action:help') {
        callbacksRef.current.onHelp()
      }
    }).then(fn => {
      unlisten = fn
    }).catch(err => {
      // Silently ignore if we're not in Tauri (running in web)
      console.debug('Menu event listener not available:', err)
    })

    return () => {
      unlisten?.()
    }
  }, [])
}
