import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $getRoot,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { INSERT_IMAGE_COMMAND } from '../commands'
import { $createImageNode } from '../nodes/ImageNode'

// Maximum image size: 50MB default, configurable via environment
const MAX_IMAGE_SIZE_MB = 50
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

// Map file extensions to MIME types
function extToMime(ext: string | undefined): string | null {
  if (!ext) return null
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return mimeMap[ext.toLowerCase()] || null
}

export default function ImagePlugin(): null {
  const [editor] = useLexicalComposerContext()

  // Register INSERT_IMAGE_COMMAND handler
  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        editor.update(() => {
          const imageNode = $createImageNode(payload.cid, payload.alt, payload.mimeType)
          const selection = $getSelection()

          if ($isRangeSelection(selection)) {
            selection.insertNodes([imageNode])
          } else {
            const root = $getRoot()
            const lastChild = root.getLastChild()
            if (lastChild) {
              lastChild.insertAfter(imageNode)
            } else {
              root.append(imageNode)
            }
          }
        })
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  // Register Tauri file-drop listener
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupDropListener = async () => {
      const unlistenFn = await getCurrentWindow().onDragDropEvent(async (event) => {
        if (event.payload.type !== 'drop') return

        for (const filePath of event.payload.paths) {
          const ext = filePath.split('.').pop()
          const mimeType = extToMime(ext)

          if (!mimeType) {
            console.warn(`Unsupported file type: ${ext}. Supported: PNG, JPEG, GIF, WebP`)
            continue
          }

          try {
            // Read file bytes using Tauri command
            const bytes: number[] = await invoke('read_file_bytes', { path: filePath })
            const uint8Array = new Uint8Array(bytes)

            // Validate file size
            if (uint8Array.length > MAX_IMAGE_SIZE_BYTES) {
              const fileSizeMB = (uint8Array.length / 1024 / 1024).toFixed(2)
              const message = `File is too large (${fileSizeMB}MB). Maximum size: ${MAX_IMAGE_SIZE_MB}MB`
              console.error(message)
              alert(message)
              continue
            }

            // Upload to server
            const response = await fetch('http://localhost:3000/images', {
              method: 'POST',
              headers: { 'Content-Type': mimeType },
              body: uint8Array,
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              const errorMessage = errorData.message || `Failed to upload image (${response.status})`
              console.error(`Upload failed: ${errorMessage}`)
              alert(`Upload failed: ${errorMessage}`)
              continue
            }

            const { cid } = await response.json()
            const fileName = filePath.split('/').pop() ?? 'image'

            // Insert image node
            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
              cid,
              alt: fileName,
              mimeType,
            })
          } catch (error) {
            console.error('Error handling dropped file:', error)
            alert(`Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      })

      unlisten = unlistenFn
    }

    setupDropListener()

    return () => {
      if (unlisten) unlisten()
    }
  }, [editor])

  return null
}
