import React, { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical'
import { INSERT_NOTE_CARD_COMMAND } from '../commands'
import { $createNoteCardNode } from '../nodes/NoteCardNode'

export default function NoteCardPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_NOTE_CARD_COMMAND,
      (payload) => {
        editor.update(() => {
          const noteNode = $createNoteCardNode(
            'Note',
            '',
            payload?.color || '#fff9e6'
          )
          const root = $getRoot()
          const lastChild = root.getLastChild()
          if (lastChild) {
            lastChild.insertAfter(noteNode)
          } else {
            root.append(noteNode)
          }
        })
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
