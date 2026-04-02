import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_EDITOR, $getSelection, $isRangeSelection } from 'lexical'
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
          }
        })
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
