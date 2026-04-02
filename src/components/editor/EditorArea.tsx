import { useEffect } from 'react'
import LexicalEditor from '@/components/editor/LexicalEditor'
import EditorErrorBoundary from '@/components/editor/EditorErrorBoundary'
import { countWordsFromLexical } from '@/utils/wordCount'

interface EditorAreaProps {
  chapterId: string
  content?: string
  onChange: (content: string) => void
  onWordCountChange?: (wordCount: number) => void
  pageBackground?: string
  showDragMenu?: boolean
  enableTreeViewPlugin?: boolean
}

export default function EditorArea({ chapterId, content, onChange, onWordCountChange, pageBackground, showDragMenu = true, enableTreeViewPlugin = false }: EditorAreaProps) {
  // Initialize word count when content loads
  useEffect(() => {
    if (content && onWordCountChange) {
      try {
        // Use improved word counter that handles lists and line breaks properly
        const wordCount = countWordsFromLexical(content)
        onWordCountChange(wordCount)
      } catch (e) {
        // If not JSON or parsing fails, fall back to 0
        onWordCountChange(0)
      }
    } else if (!content && onWordCountChange) {
      onWordCountChange(0)
    }
  }, [content, onWordCountChange])

  const handleContentChange = (serialisedState: string, wordCount: number) => {
    console.log(`[EDITOR] Content changed: ${serialisedState.length} bytes`)
    onChange(serialisedState)
    if (onWordCountChange) {
      onWordCountChange(wordCount)
    }
  }

  return (
    <EditorErrorBoundary>
      <div style={{ flex: 1, overflowY: 'auto', background: pageBackground ?? '#f9f9f9' }}>
        <LexicalEditor
          chapterId={chapterId}
          initialContent={content}
          onContentChange={handleContentChange}
          showDragMenu={showDragMenu}
          enableTreeViewPlugin={enableTreeViewPlugin}
        />
      </div>
    </EditorErrorBoundary>
  )
}
