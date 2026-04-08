import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_EDITOR, $getSelection, $isRangeSelection, $createParagraphNode } from 'lexical'
import { useEffect } from 'react'
import { INSERT_SCENE_BREAK_COMMAND } from '../commands'
import { $createSceneBreakNode } from '../nodes/SceneBreakNode'

export default function SceneBreakPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_SCENE_BREAK_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const sceneBreak = $createSceneBreakNode()
            selection.insertNodes([sceneBreak])

            // Move selection after the scene break and create a new paragraph
            const nextSibling = sceneBreak.getNextSibling()
            if (nextSibling) {
              nextSibling.selectStart()
            } else {
              // If no next sibling, create one
              const paragraph = $createParagraphNode()
              sceneBreak.insertAfter(paragraph)
              paragraph.selectStart()
            }
          }
        })
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
