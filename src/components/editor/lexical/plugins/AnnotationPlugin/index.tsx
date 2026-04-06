import { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, SELECTION_CHANGE_COMMAND } from 'lexical'
import {
  ADD_ANNOTATION_COMMAND,
  AddAnnotationPayload,
} from '../../commands'
import * as annotationsApi from '@/api/annotations'
import { Annotation, AnnotationCategory } from '@/api/annotations'
import { FloatingAnnotationToolbar } from './FloatingAnnotationToolbar'
import { AnnotationGutterBars } from './AnnotationGutterBars'
import GenericModal from '@/components/shared/GenericModal'
import ModalActions from '@/components/shared/ModalActions'
import './index.css'

function generateMarkId(): string {
  return 'mark-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

interface AnnotationPluginProps {
  documentId: string
  onAnnotationsChange?: (annotations: Annotation[]) => void
}

const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  'draft-note': 'Draft Note',
  'needs-revision': 'Needs Revision',
  'author-note': 'Author Note',
}

export function AnnotationPlugin({ documentId, onAnnotationsChange }: AnnotationPluginProps) {
  const [editor] = useLexicalComposerContext()
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null)
  const [editingComment, setEditingComment] = useState('')

  // Load annotations on mount
  useEffect(() => {
    let isMounted = true

    const loadAnnotations = async () => {
      try {
        const loadedAnnotations = await annotationsApi.listAnnotations(documentId)
        if (isMounted) {
          setAnnotations(loadedAnnotations)
          onAnnotationsChange?.(loadedAnnotations)
        }
      } catch (error) {
        // Silently fail if server is not responding — don't block UI
        // The annotation feature is optional and works without the server for now
        if (isMounted) {
          console.debug('Annotations unavailable (server not running):', error instanceof Error ? error.message : 'Unknown error')
        }
      }
    }

    loadAnnotations()

    return () => {
      isMounted = false
    }
  }, [documentId, onAnnotationsChange])

  // Register command handlers
  useEffect(() => {
    const unregisterAdd = editor.registerCommand<AddAnnotationPayload>(
      ADD_ANNOTATION_COMMAND,
      (payload) => {
        const markId = generateMarkId()
        let markedText = ''
        let blockKey: string | undefined = undefined
        let focusBlockKey: string | undefined = undefined

        try {
          // Command handlers run inside an update context, so we can call $getSelection() directly
          const selection = $getSelection()
          if (!$isRangeSelection(selection) || selection.isCollapsed()) {
            console.warn('[AnnotationPlugin] Invalid selection')
            return false
          }

          // Get the text content and block key range synchronously
          markedText = selection.getTextContent()
          try {
            // Get anchor block (start of selection)
            const anchorNode = selection.anchor.getNode()
            const anchorBlock = anchorNode.getTopLevelElementOrThrow()
            blockKey = anchorBlock.getKey()

            // Get focus block (end of selection)
            const focusNode = selection.focus.getNode()
            const focusBlock = focusNode.getTopLevelElementOrThrow()
            focusBlockKey = focusBlock.getKey()
          } catch (e) {
            // Silently fail — block keys are optional
          }

          // Save annotation to server asynchronously (no tree modifications)
          annotationsApi.createAnnotation(documentId, markId, payload.category, markedText, blockKey, focusBlockKey)
            .then(() => {
              return annotationsApi.listAnnotations(documentId)
            })
            .then((loadedAnnotations) => {
              setAnnotations(loadedAnnotations)
              onAnnotationsChange?.(loadedAnnotations)
            })
            .catch((error) => console.error('[AnnotationPlugin] Failed to create annotation:', error))

          return true
        } catch (error) {
          console.error('[AnnotationPlugin] Error in ADD_ANNOTATION_COMMAND:', error)
          return false
        }
      },
      1
    )

    return () => {
      unregisterAdd()
    }
  }, [editor, documentId, onAnnotationsChange])

  // Register selection change handler
  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        try {
          editor.read(() => {
            const selection = $getSelection()

            // Update toolbar visibility
            if ($isRangeSelection(selection) && !selection.isCollapsed()) {
              const domSelection = window.getSelection()
              if (domSelection && domSelection.rangeCount > 0) {
                const range = domSelection.getRangeAt(0)
                const rect = range.getBoundingClientRect()
                setToolbarPosition({
                  top: rect.top,
                  left: rect.left + rect.width / 2,
                })
                setShowToolbar(true)
              }
            } else {
              setShowToolbar(false)
            }
          })
        } catch (error) {
          console.error('[AnnotationPlugin] Error in selection change handler:', error)
        }

        return false
      },
      1
    )
  }, [editor])

  const handleDeleteAnnotation = async (markId: string) => {
    try {
      await annotationsApi.deleteAnnotation(markId)
      const loadedAnnotations = await annotationsApi.listAnnotations(documentId)
      setAnnotations(loadedAnnotations)
      onAnnotationsChange?.(loadedAnnotations)
    } catch (error) {
      console.error('[AnnotationPlugin] Failed to delete annotation:', error)
    }
  }

  const handleUpdateComment = async (markId: string, comment: string) => {
    try {
      await annotationsApi.updateAnnotation(markId, { comment })
      const loadedAnnotations = await annotationsApi.listAnnotations(documentId)
      setAnnotations(loadedAnnotations)
      onAnnotationsChange?.(loadedAnnotations)
    } catch (error) {
      console.error('[AnnotationPlugin] Failed to update annotation:', error)
    }
  }

  const handleOpenDetail = (annotation: Annotation) => {
    setActiveAnnotation(annotation)
    setEditingComment(annotation.comment || '')
  }

  const handleModalClose = () => {
    setActiveAnnotation(null)
  }

  const handleModalSave = async () => {
    if (activeAnnotation) {
      await handleUpdateComment(activeAnnotation.markId, editingComment)
      handleModalClose()
    }
  }

  const handleModalDelete = async () => {
    if (activeAnnotation) {
      await handleDeleteAnnotation(activeAnnotation.markId)
      handleModalClose()
    }
  }

  const modalActions = [
    { label: 'Save', onClick: handleModalSave, variant: 'primary' as const },
    { label: 'Delete', onClick: handleModalDelete, variant: 'secondary' as const },
  ]

  return (
    <>
      <FloatingAnnotationToolbar show={showToolbar} position={toolbarPosition} />
      <AnnotationGutterBars
        annotations={annotations}
        onOpenDetail={handleOpenDetail}
      />
      <GenericModal
        isOpen={activeAnnotation !== null}
        onClose={handleModalClose}
        title={activeAnnotation ? CATEGORY_LABELS[activeAnnotation.category] : 'Annotation'}
        closeOnClickOutside
      >
        <textarea
          value={editingComment}
          onChange={(e) => setEditingComment(e.currentTarget.value)}
          placeholder="Add a comment..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '8px',
            marginBottom: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
        <ModalActions actions={modalActions} />
      </GenericModal>
    </>
  )
}
