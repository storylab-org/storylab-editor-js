import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import { $getSelection, $isRangeSelection } from 'lexical'

interface TypewriterPluginProps {
  typewriterMode?: boolean
  scrollerRef?: React.RefObject<HTMLDivElement>
}

export default function TypewriterPlugin({ typewriterMode = false, scrollerRef }: TypewriterPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!typewriterMode || !scrollerRef?.current) return

    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        // Get the node at the selection anchor and find its top-level element (paragraph)
        const anchorNode = selection.anchor.getNode()
        const paragraph = anchorNode.getTopLevelElement()
        if (!paragraph) return

        // Get the DOM element corresponding to this node
        const dom = editor.getElementByKey(paragraph.getKey())
        if (!dom || !scrollerRef.current) return

        // Get bounding rectangles
        const elementRect = dom.getBoundingClientRect()
        const scrollerRect = scrollerRef.current.getBoundingClientRect()

        // Calculate the offset to centre the element vertically
        // Target: element top should be at scrollerTop + scrollerHeight / 2
        const targetScrollY = scrollerRect.top + scrollerRect.height / 2
        const offset = elementRect.top - targetScrollY

        // Only scroll if the offset is significant (>5px threshold to avoid jitter)
        // Use instant scroll to avoid animation conflicts with cursor rendering
        if (Math.abs(offset) > 5) {
          scrollerRef.current.scrollBy({
            top: offset,
            behavior: 'auto',
          })
        }
      })
    })
  }, [editor, typewriterMode, scrollerRef])

  return null
}
