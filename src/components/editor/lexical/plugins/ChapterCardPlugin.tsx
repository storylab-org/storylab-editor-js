import React, { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical'
import { INSERT_CHAPTER_CARD_COMMAND } from '../commands'
import { $createChapterCardNode } from '../nodes/ChapterCardNode'

interface ChapterCardPluginProps {
  onNavigate: (id: string) => void
}

export default function ChapterCardPlugin({ onNavigate }: ChapterCardPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_CHAPTER_CARD_COMMAND,
      (payload) => {
        editor.update(() => {
          const cardNode = $createChapterCardNode(
            payload.chapterId,
            payload.chapterName,
            payload.style
          )
          const root = $getRoot()
          const lastChild = root.getLastChild()
          if (lastChild) {
            lastChild.insertAfter(cardNode)
          } else {
            root.append(cardNode)
          }
        })
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  // Listen for openChapter events from ChapterCardComponent
  useEffect(() => {
    const handleOpenChapter = (event: Event) => {
      if (event instanceof CustomEvent) {
        const chapterId = event.detail?.chapterId
        if (chapterId) {
          onNavigate(chapterId)
        }
      }
    }

    document.addEventListener('openChapter', handleOpenChapter)
    return () => document.removeEventListener('openChapter', handleOpenChapter)
  }, [onNavigate])

  return null
}
