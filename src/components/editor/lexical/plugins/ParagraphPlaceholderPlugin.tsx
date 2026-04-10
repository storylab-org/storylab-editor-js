import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import { $getSelection, $isRangeSelection, $isParagraphNode } from 'lexical'

export default function ParagraphPlaceholderPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        // Get the node at the selection anchor
        const anchorNode = selection.anchor.getNode()
        const paragraph = anchorNode.getTopLevelElement()

        // Clear previous active placeholders
        const prevActiveParagraphs = document.querySelectorAll('[data-paragraph-placeholder]')
        prevActiveParagraphs.forEach((el) => {
          el.removeAttribute('data-paragraph-placeholder')
        })

        // Only show placeholder if this is an empty paragraph
        if ($isParagraphNode(paragraph)) {
          const textContent = paragraph.getTextContent()
          if (textContent === '') {
            const dom = editor.getElementByKey(paragraph.getKey())
            if (dom) {
              dom.setAttribute('data-paragraph-placeholder', 'Type / for commands')
            }
          }
        }
      })
    })
  }, [editor])

  return null
}
