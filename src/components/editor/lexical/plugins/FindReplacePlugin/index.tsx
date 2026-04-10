import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_NORMAL, createCommand } from 'lexical'
import { getStateInstance } from './findReplaceStore'

// Custom command to open Find & Replace
export const OPEN_FIND_REPLACE_COMMAND = createCommand<void>()

export { FindReplaceContext, useFindReplace } from './FindReplaceContext'
export { useFindReplaceState } from './useFindReplaceState'

/**
 * FindReplacePlugin registers the Cmd+F command to open Find & Replace.
 * The state is managed by useFindReplaceState (called in EditorArea's FindReplaceProvider).
 * This plugin just registers the keyboard command.
 */
export default function FindReplacePlugin(): null {
  const [editor] = useLexicalComposerContext()

  // Register command to open Find & Replace
  useEffect(() => {
    return editor.registerCommand(
      OPEN_FIND_REPLACE_COMMAND,
      () => {
        const state = getStateInstance()
        if (state) {
          state.onOpen()
        }
        return true
      },
      COMMAND_PRIORITY_NORMAL
    )
  }, [editor])

  // Plugin doesn't render anything
  return null
}
