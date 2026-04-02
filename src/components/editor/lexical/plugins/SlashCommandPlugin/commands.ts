import React from 'react'
import type { LexicalEditor } from 'lexical'
import { $getSelection, $isRangeSelection } from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import {
  $createHeadingNode,
  $createQuoteNode,
} from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import {
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '@lexical/react/LexicalHorizontalRuleNode'
import { INSERT_IMAGE_COMMAND, INSERT_SCENE_BREAK_COMMAND } from '../../commands'
import {
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Table2,
  Minus,
  Image,
  User,
  MapPin,
  Package,
} from 'lucide-react'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export interface SlashCommand {
  id: string
  triggers: string[]
  label: string
  description: string
  icon: React.ReactNode
  execute: (editor: LexicalEditor) => void
}

export function buildSlashCommands(
  editor: LexicalEditor,
  options?: {
    onTableInsert?: () => void
    onImagePicker?: (onSuccess: (cid: string, alt: string, mimeType: string) => void) => void
  }
): SlashCommand[] {
  const headingCommand = (level: 'h1' | 'h2' | 'h3') => () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(level))
      }
    })
  }

  const quoteCommand = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const codeCommand = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode())
      }
    })
  }

  const hrCommand = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
  }

  const sceneBreakCommand = () => {
    editor.dispatchCommand(INSERT_SCENE_BREAK_COMMAND, undefined)
  }

  const imageCommand = () => {
    if (options?.onImagePicker) {
      options.onImagePicker((cid, alt, mimeType) => {
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, { cid, alt, mimeType })
      })
    } else {
      // Fallback: open file picker directly
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/png,image/jpeg,image/gif,image/webp'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        try {
          if (file.size > MAX_IMAGE_SIZE_BYTES) {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
            console.error(
              `File is too large (${fileSizeMB}MB). Maximum size: 5MB`
            )
            return
          }

          const bytes = await file.arrayBuffer()
          const response = await fetch('http://localhost:3000/images', {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: bytes,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.message || `Upload failed (${response.status})`
            console.error(`Failed to upload image: ${errorMessage}`)
            return
          }

          const { cid } = await response.json()
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            cid,
            alt: file.name,
            mimeType: file.type,
          })
        } catch (error) {
          console.error('Error uploading image:', error)
        }
      }
      input.click()
    }
  }

  const insertTriggerChar = (trigger: string) => () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertText(trigger)
      }
    })
  }

  return [
    {
      id: 'heading1',
      triggers: ['h1', 'heading1', 'heading 1'],
      label: 'Heading 1',
      description: 'Large section header',
      icon: React.createElement(Heading1, { size: 16 }),
      execute: headingCommand('h1'),
    },
    {
      id: 'heading2',
      triggers: ['h2', 'heading2', 'heading 2'],
      label: 'Heading 2',
      description: 'Section header',
      icon: React.createElement(Heading2, { size: 16 }),
      execute: headingCommand('h2'),
    },
    {
      id: 'heading3',
      triggers: ['h3', 'heading3', 'heading 3'],
      label: 'Heading 3',
      description: 'Sub-section',
      icon: React.createElement(Heading3, { size: 16 }),
      execute: headingCommand('h3'),
    },
    {
      id: 'quote',
      triggers: ['quote', 'blockquote'],
      label: 'Quote Block',
      description: 'In-world text, letter, or monologue',
      icon: React.createElement(Quote, { size: 16 }),
      execute: quoteCommand,
    },
    {
      id: 'code',
      triggers: ['code', 'codeblock'],
      label: 'Code Block',
      description: 'Technical notation or stat blocks',
      icon: React.createElement(Code, { size: 16 }),
      execute: codeCommand,
    },
    {
      id: 'table',
      triggers: ['table'],
      label: 'Table',
      description: 'Data table or stat sheet',
      icon: React.createElement(Table2, { size: 16 }),
      execute: () => {
        options?.onTableInsert?.()
      },
    },
    {
      id: 'hr',
      triggers: ['hr', 'divider', 'line'],
      label: 'Divider',
      description: 'Horizontal rule or scene break',
      icon: React.createElement(Minus, { size: 16 }),
      execute: hrCommand,
    },
    {
      id: 'scene-break',
      triggers: ['scene', 'break', 'scene-break', 'asterism'],
      label: 'Scene Break',
      description: 'Visual separator between scenes',
      icon: React.createElement(Minus, { size: 16 }),
      execute: sceneBreakCommand,
    },
    {
      id: 'image',
      triggers: ['image', 'img', 'picture'],
      label: 'Image',
      description: 'Insert an image',
      icon: React.createElement(Image, { size: 16 }),
      execute: imageCommand,
    },
    {
      id: 'mention-character',
      triggers: ['character', '@'],
      label: 'Character Mention',
      description: 'Mention a character',
      icon: React.createElement(User, { size: 16 }),
      execute: insertTriggerChar('@'),
    },
    {
      id: 'mention-location',
      triggers: ['location', '#'],
      label: 'Location Mention',
      description: 'Mention a location',
      icon: React.createElement(MapPin, { size: 16 }),
      execute: insertTriggerChar('#'),
    },
    {
      id: 'mention-item',
      triggers: ['item', '!'],
      label: 'Item Mention',
      description: 'Mention an item',
      icon: React.createElement(Package, { size: 16 }),
      execute: insertTriggerChar('!'),
    },
  ]
}
