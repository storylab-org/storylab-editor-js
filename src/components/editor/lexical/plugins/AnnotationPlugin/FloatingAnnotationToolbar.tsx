import { useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ADD_ANNOTATION_COMMAND } from '../../commands'
import { AnnotationCategory } from '@/api/annotations'
import { MessageSquare, AlertCircle, BookOpen } from 'lucide-react'
import './FloatingAnnotationToolbar.css'

interface FloatingAnnotationToolbarProps {
  show: boolean
  position: { top: number; left: number } | null
}

export function FloatingAnnotationToolbar({ show, position }: FloatingAnnotationToolbarProps) {
  const [editor] = useLexicalComposerContext()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [displayPosition, setDisplayPosition] = useState<{ top: number; left: number } | null>(position)

  useEffect(() => {
    if (show && position) {
      setDisplayPosition(position)
    }
  }, [show, position])

  useEffect(() => {
    if (!show) return

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Toolbar will be hidden by parent when selection changes
      }
    }

    const handleScroll = () => {
      if (position && displayPosition) {
        setDisplayPosition({
          top: position.top + window.scrollY,
          left: position.left + window.scrollX,
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [show, position, displayPosition])

  const handleAddAnnotation = (category: AnnotationCategory) => {
    editor.dispatchCommand(ADD_ANNOTATION_COMMAND, { category })
  }

  if (!show || !displayPosition) return null

  const toolbarHeight = 44
  const toolbarWidth = 140

  const finalTop = displayPosition.top - toolbarHeight - 8
  const finalLeft = displayPosition.left - toolbarWidth / 2

  return (
    <div
      ref={toolbarRef}
      className="floating-annotation-toolbar"
      style={{
        position: 'fixed',
        top: `${finalTop}px`,
        left: `${finalLeft}px`,
        zIndex: 1000,
      }}
    >
      <button
        className="annotation-toolbar-button annotation-toolbar-button--draft-note"
        onClick={() => handleAddAnnotation('draft-note')}
        title="Mark as draft note"
      >
        <MessageSquare size={16} />
        <span>Draft</span>
      </button>
      <button
        className="annotation-toolbar-button annotation-toolbar-button--needs-revision"
        onClick={() => handleAddAnnotation('needs-revision')}
        title="Mark as needs revision"
      >
        <AlertCircle size={16} />
        <span>Revise</span>
      </button>
      <button
        className="annotation-toolbar-button annotation-toolbar-button--author-note"
        onClick={() => handleAddAnnotation('author-note')}
        title="Mark as author note"
      >
        <BookOpen size={16} />
        <span>Author</span>
      </button>
    </div>
  )
}
