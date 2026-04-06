import { useCallback, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Annotation, AnnotationCategory, updateAnnotation } from '@/api/annotations'
import { SCROLL_TO_ANNOTATION_COMMAND } from '../../commands'
import { MessageSquare, AlertCircle, BookOpen, Trash2 } from 'lucide-react'
import './AnnotationSidebarPanel.css'

interface AnnotationSidebarPanelProps {
  annotations: Annotation[]
  activeMarkId: string | null
  onDelete?: (markId: string) => void
}

const CATEGORY_ICONS: Record<AnnotationCategory, React.ReactNode> = {
  'draft-note': <MessageSquare size={14} />,
  'needs-revision': <AlertCircle size={14} />,
  'author-note': <BookOpen size={14} />,
}

const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  'draft-note': 'Draft Note',
  'needs-revision': 'Needs Revision',
  'author-note': 'Author Note',
}

export function AnnotationSidebarPanel({ annotations, activeMarkId, onDelete }: AnnotationSidebarPanelProps) {
  const [editor] = useLexicalComposerContext()
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const sortedAnnotations = [...annotations].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const handleNavigateToAnnotation = useCallback(
    (markId: string) => {
      editor.dispatchCommand(SCROLL_TO_ANNOTATION_COMMAND, { markId })
    },
    [editor]
  )

  const handleStartEdit = (annotation: Annotation) => {
    setEditingMarkId(annotation.markId)
    setEditingText(annotation.comment || '')
  }

  const handleSaveComment = useCallback(
    (markId: string, comment: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current as NodeJS.Timeout)
      }

      debounceTimerRef.current = setTimeout(() => {
        updateAnnotation(markId, { comment })
          .catch((error) => console.error('Failed to update annotation comment:', error))
      }, 500)
    },
    []
  )

  const handleDeleteAnnotation = useCallback(
    (markId: string) => {
      onDelete?.(markId)
    },
    [onDelete]
  )

  if (annotations.length === 0) {
    return (
      <div className="annotation-sidebar-panel">
        <div className="annotation-panel-header">Annotations</div>
        <div className="annotation-panel-empty">No annotations yet. Select text to add one.</div>
      </div>
    )
  }

  return (
    <div className="annotation-sidebar-panel">
      <div className="annotation-panel-header">Annotations ({annotations.length})</div>
      <div className="annotation-panel-cards">
        {sortedAnnotations.map((annotation) => (
          <div
            key={annotation.markId}
            className={`annotation-card annotation-card--${annotation.category} ${
              activeMarkId === annotation.markId ? 'annotation-card--active' : ''
            }`}
          >
            <div className="annotation-card-header">
              <button
                className="annotation-card-icon"
                onClick={() => handleNavigateToAnnotation(annotation.markId)}
                title={`Navigate to ${CATEGORY_LABELS[annotation.category]}`}
              >
                {CATEGORY_ICONS[annotation.category]}
              </button>
              <span className="annotation-card-category">{CATEGORY_LABELS[annotation.category]}</span>
              <button
                className="annotation-card-delete"
                onClick={() => handleDeleteAnnotation(annotation.markId)}
                title="Delete annotation"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {editingMarkId === annotation.markId ? (
              <textarea
                className="annotation-card-comment-edit"
                value={editingText}
                onChange={(e) => {
                  setEditingText(e.currentTarget.value)
                  handleSaveComment(annotation.markId, e.currentTarget.value)
                }}
                onBlur={() => setEditingMarkId(null)}
                placeholder="Add a comment..."
                autoFocus
              />
            ) : (
              <div
                className="annotation-card-comment"
                onClick={() => handleStartEdit(annotation)}
                style={{ cursor: 'pointer' }}
              >
                {annotation.comment || <span className="annotation-card-comment-placeholder">Click to add comment...</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
