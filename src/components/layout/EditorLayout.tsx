import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/sidebar/Sidebar'
import EditorArea from '@/components/editor/EditorArea'
import EditorToolbar from '@/components/editor/EditorToolbar'
import GenericModal from '@/components/shared/GenericModal'
import ChapterSettingsModal from '@/components/editor/ChapterSettingsModal'
import DraftBoard from '@/components/draftboard/DraftBoard'
import { ToastProvider } from '@/components/shared/ToastContext'
import ToastContainer from '@/components/shared/ToastContainer'
import HelpModal from '@/components/modals/HelpModal'
import ImportConfirmModal from '@/components/modals/ImportConfirmModal'
import ExportFilenameModal from '@/components/modals/ExportFilenameModal'
import { OVERVIEW_ID } from '@/constants'
import { detectCommonShortcuts } from '@/utils/keyboardUtils'
import { useChapters } from '@/hooks/useChapters'
import { useChapterContent } from '@/hooks/useChapterContent'
import { useChapterSettings } from '@/hooks/useChapterSettings'
import { useExportImport } from '@/hooks/useExportImport'
import { useTauriMenuEvents } from '@/hooks/useTauriMenuEvents'
import { updateDocument } from '@/api/documents'

const isDevelopmentMode = import.meta.env.MODE === 'development'

export default function EditorLayout() {
  // Custom hooks for domain logic
  const chapters = useChapters()
  const content = useChapterContent(chapters.activeChapterId)
  const settings = useChapterSettings()
  const exportImport = useExportImport()

  // Local UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [applyOrderHandler, setApplyOrderHandler] = useState<(() => void) | null>(null)
  const [canApplyOrder, setCanApplyOrder] = useState(false)

  const activeChapter = chapters.chapters.find((c) => c.id === chapters.activeChapterId)

  // Handle chapter selection with save
  const handleSelectChapterWithSave = useCallback(async (id: string) => {
    console.log(`[SWITCH] Switching to chapter "${id}"`)

    // Save before switching if dirty
    if (content.isDirty && chapters.activeChapterId && chapters.activeChapterId !== OVERVIEW_ID) {
      console.log(`[SWITCH] Saving dirty chapter before switching...`)
      await content.handleSave()
    }

    chapters.handleSelectChapter(id)
  }, [content, chapters])

  // Keyboard shortcuts (save + typewriter mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcuts = detectCommonShortcuts(e)

      if (shortcuts.isTypewriterMode) {
        e.preventDefault()
        setTypewriterMode(prev => !prev)
      } else if (shortcuts.isSave) {
        e.preventDefault()
        content.handleSave()
      }
      // Note: Cmd+F is handled by the FindReplacePlugin
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content])

  // Tauri menu event integration
  useTauriMenuEvents({
    onExport: exportImport.handleExport,
    onImport: exportImport.handleImport,
    onNewChapter: chapters.handleCreateChapter,
    onFindReplace: () => {
      // Dispatched to document in useTauriMenuEvents
    },
    onDraftBoard: () => chapters.handleSelectChapter(OVERVIEW_ID),
    onHelp: () => setIsHelpOpen(true),
  })

  // Handle export confirmation
  const handleExportConfirm = useCallback(async (filename: string) => {
    await exportImport.handleExportConfirm(filename)
  }, [exportImport])

  // Handle import confirmation
  const handleImportConfirm = useCallback(async () => {
    await exportImport.handleImportConfirm((firstChapterId: string | null) => {
      if (firstChapterId) {
        chapters.handleSelectChapter(firstChapterId)
      }
    })
  }, [exportImport, chapters])

  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#ffffff' }}>
        <Sidebar
          activeChapterId={chapters.activeChapterId || ''}
          onSelectChapter={handleSelectChapterWithSave}
          chapters={chapters.sortedChapters}
          isLoading={chapters.isLoading}
          onCreateChapter={chapters.handleCreateChapter}
          onDeleteChapter={chapters.handleDeleteChapter}
          onReorder={chapters.handleReorder}
          onExport={exportImport.handleExport}
          onImport={exportImport.handleImport}
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <EditorToolbar
            chapterId={chapters.activeChapterId === OVERVIEW_ID ? undefined : chapters.activeChapterId || ''}
            chapterTitle={chapters.activeChapterId === OVERVIEW_ID ? 'Overview' : activeChapter?.name || 'Untitled'}
            saveStatus={content.saveStatus}
            onSave={content.handleSave}
            onSettings={chapters.activeChapterId === OVERVIEW_ID ? undefined : () => setIsSettingsOpen(true)}
            onApplyOrder={applyOrderHandler || undefined}
            canApplyOrder={canApplyOrder}
            onHelp={() => setIsHelpOpen(true)}
            typewriterMode={typewriterMode}
          />
          {content.loadedChapterId === OVERVIEW_ID ? (
            <DraftBoard
              chapters={[...chapters.chapters].sort((a, b) => a.order - b.order)}
              onNavigateToChapter={handleSelectChapterWithSave}
              onChaptersReordered={chapters.refreshChapters}
              onApplyOrderReady={(handler, canApply) => {
                setApplyOrderHandler(() => handler)
                setCanApplyOrder(canApply)
              }}
            />
          ) : (
            chapters.activeChapterId && content.loadedChapterId === chapters.activeChapterId && (
              <EditorArea
                key={chapters.activeChapterId}
                chapterId={chapters.activeChapterId}
                content={content.content}
                pageBackground={settings.getChapterSettings(chapters.activeChapterId).pageBackground ?? '#f9f9f9'}
                showDragMenu={settings.getChapterSettings(chapters.activeChapterId).showDragMenu ?? true}
                enableTreeViewPlugin={settings.getChapterSettings(chapters.activeChapterId).enableTreeViewPlugin ?? false}
                typewriterMode={typewriterMode}
                onChange={(newContent) => {
                  console.log(`[EDITOR] Content changed: ${newContent.length} bytes`)
                  content.setContent(newContent)
                  content.setIsDirty(true)
                }}
                onWordCountChange={() => {
                  // Word count is tracked internally by EditorArea
                }}
              />
            )
          )}
          {chapters.activeChapterId === OVERVIEW_ID ? (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: '#999', borderTop: '1px solid #e5e5e5' }}>
              Overview
            </div>
          ) : (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: '#999', borderTop: '1px solid #e5e5e5' }}>
              {content.content.split(/\s+/).length} words
            </div>
          )}
        </div>

        {/* Chapter Settings Modal */}
        <GenericModal
          isOpen={isSettingsOpen && !!chapters.activeChapterId}
          onClose={() => setIsSettingsOpen(false)}
          title="Chapter Settings"
          closeOnClickOutside={false}
        >
          {chapters.activeChapterId && (
            <ChapterSettingsModal
              chapterName={activeChapter?.name ?? ''}
              onNameChange={async (name) => {
                if (chapters.activeChapterId) {
                  try {
                    console.log(`[SETTINGS] Updating chapter name to "${name}"`)
                    await updateDocument(chapters.activeChapterId, content.content, name)
                    console.log(`[SETTINGS] ✓ Chapter name updated`)
                    // Refresh chapters list to pick up the name change
                    chapters.refreshChapters()
                  } catch (error) {
                    console.error(`[SETTINGS] ✗ Failed to update chapter name:`, error)
                  }
                }
              }}
              initialBackground={settings.getChapterSettings(chapters.activeChapterId).pageBackground ?? '#f9f9f9'}
              onChange={(bg) => settings.updateSettings(chapters.activeChapterId ?? '', 'pageBackground', bg)}
              initialShowDragMenu={settings.getChapterSettings(chapters.activeChapterId).showDragMenu ?? true}
              onShowDragMenuChange={(show) => settings.updateSettings(chapters.activeChapterId ?? '', 'showDragMenu', show)}
              isDevelopment={isDevelopmentMode}
              initialEnableTreeViewPlugin={settings.getChapterSettings(chapters.activeChapterId).enableTreeViewPlugin ?? false}
              onEnableTreeViewPluginChange={(enabled) => settings.updateSettings(chapters.activeChapterId ?? '', 'enableTreeViewPlugin', enabled)}
            />
          )}
        </GenericModal>

        {/* Import Confirmation Modal */}
        <ImportConfirmModal
          isOpen={!!exportImport.importPendingFormat}
          onClose={exportImport.handleImportCancel}
          onConfirm={handleImportConfirm}
          isImporting={exportImport.isImporting}
          format={exportImport.importPendingFormat}
        />

        {/* Export Filename Modal */}
        <ExportFilenameModal
          isOpen={!!exportImport.exportModalState}
          onClose={() => exportImport.setExportModalState(null)}
          onConfirm={handleExportConfirm}
          filename={exportImport.exportModalState?.filename ?? ''}
          onFilenameChange={(filename) => {
            if (exportImport.exportModalState) {
              exportImport.setExportModalState({
                ...exportImport.exportModalState,
                filename
              })
            }
          }}
          format={exportImport.exportModalState?.format ?? null}
        />

        {/* Help Modal */}
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      </div>
      <ToastContainer />
    </ToastProvider>
  )
}
