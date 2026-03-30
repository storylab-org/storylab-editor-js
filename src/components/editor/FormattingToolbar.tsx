import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND, $getSelection, $isRangeSelection, $createParagraphNode, $isRootOrShadowRoot } from 'lexical'
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, $isListNode, ListNode } from '@lexical/list'
import { $createCodeNode } from '@lexical/code'
import { $createHeadingNode, $isHeadingNode, $createQuoteNode, HeadingTagType } from '@lexical/rich-text'
import { $setBlocksType, $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection'
import { $getNearestNodeOfType, $findMatchingParent } from '@lexical/utils'
import { $isTableSelection } from '@lexical/table'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Image,
} from 'lucide-react'
import DropDown, { DropDownItem } from './lexical/ui/DropDown'
import { INSERT_IMAGE_COMMAND } from './lexical/commands'
import './FormattingToolbar.css'

// Maximum image size: 50MB
const MAX_IMAGE_SIZE_MB = 50
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'check' | 'quote' | 'code'

export default function FormattingToolbar() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [blockType, setBlockType] = useState<BlockType>('paragraph')
  const [fontSize, setFontSize] = useState('15px')

  const handleFormat = useCallback((command: string, arg?: string) => {
    editor.dispatchCommand(command as any, arg as any)
  }, [editor])

  const formatParagraph = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection) || $isTableSelection(selection))
        $setBlocksType(selection, () => $createParagraphNode())
    })
  }, [editor])

  const formatHeading = useCallback((tag: HeadingTagType) => {
    if (blockType !== tag) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection) || $isTableSelection(selection))
          $setBlocksType(selection, () => $createHeadingNode(tag))
      })
    }
  }, [editor, blockType])

  const formatQuote = useCallback(() => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection) || $isTableSelection(selection))
          $setBlocksType(selection, () => $createQuoteNode())
      })
    }
  }, [editor, blockType])

  const formatCode = useCallback(() => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection) || $isTableSelection(selection)) {
          if (selection.isCollapsed()) {
            $setBlocksType(selection, () => $createCodeNode())
          } else {
            const textContent = selection.getTextContent()
            const codeNode = $createCodeNode()
            selection.insertNodes([codeNode])
            const sel = $getSelection()
            if ($isRangeSelection(sel)) sel.insertRawText(textContent)
          }
        }
      })
    }
  }, [editor, blockType])

  const applyFontSize = useCallback((size: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-size': size })
      }
    })
  }, [editor])

  const openImageFilePicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/gif,image/webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        // Validate file size
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
          const message = `File is too large (${fileSizeMB}MB). Maximum size: ${MAX_IMAGE_SIZE_MB}MB`
          console.error(message)
          alert(message)
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
          alert(`Failed to upload image: ${errorMessage}`)
          return
        }

        const { cid } = await response.json()
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
          cid,
          alt: file.name,
          mimeType: file.type,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error uploading image:', error)
        alert(`Error uploading image: ${message}`)
      }
    }
    input.click()
  }, [editor])

  const blockTypeLabels: Record<BlockType, string> = {
    paragraph: 'Normal', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
    bullet: 'Bullet List', number: 'Numbered List', check: 'Check List',
    quote: 'Quote', code: 'Code Block',
  }

  const FONT_SIZE_OPTIONS = ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '24px', '28px', '32px']

  const BlockIcon = ({ type }: { type: BlockType }) => {
    if (type === 'h1') return <Heading1 size={16} />
    if (type === 'h2') return <Heading2 size={16} />
    if (type === 'h3') return <Heading3 size={16} />
    if (type === 'quote') return <Quote size={16} />
    if (type === 'code') return <Code size={16} />
    return <Type size={16} />
  }

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'))
          setIsItalic(selection.hasFormat('italic'))
          setIsUnderline(selection.hasFormat('underline'))

          // Detect block type
          const anchorNode = selection.anchor.getNode()
          let element = anchorNode.getKey() === 'root'
            ? anchorNode
            : $findMatchingParent(anchorNode, (e) => {
                const parent = e.getParent()
                return parent !== null && $isRootOrShadowRoot(parent)
              })
          if (element === null) element = anchorNode.getTopLevelElementOrThrow()

          if ($isListNode(element)) {
            const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode)
            setBlockType((parentList ? parentList.getListType() : element.getListType()) as BlockType)
          } else {
            const type = $isHeadingNode(element) ? element.getTag() : element.getType()
            setBlockType(type as BlockType)
          }

          setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '15px'))
        }
      })
    })
  }, [editor])

  return (
    <div className="formatting-toolbar">
      <button
        title="Undo (Ctrl+Z)"
        onClick={() => handleFormat(UNDO_COMMAND)}
        className="format-btn"
      >
        <Undo2 size={16} />
      </button>

      <button
        title="Redo (Ctrl+Y)"
        onClick={() => handleFormat(REDO_COMMAND)}
        className="format-btn"
      >
        <Redo2 size={16} />
      </button>

      <DropDown
        buttonLabel={blockTypeLabels[blockType]}
        buttonIcon={<BlockIcon type={blockType} />}
        buttonClassName="format-btn format-btn-block"
        buttonAriaLabel="Block format"
      >
        <DropDownItem className={`item ${blockType === 'paragraph' ? 'active' : ''}`} onClick={formatParagraph}>
          <Type size={16} /><span className="text">Normal</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'h1' ? 'active' : ''}`} onClick={() => formatHeading('h1')}>
          <Heading1 size={16} /><span className="text">Heading 1</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'h2' ? 'active' : ''}`} onClick={() => formatHeading('h2')}>
          <Heading2 size={16} /><span className="text">Heading 2</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'h3' ? 'active' : ''}`} onClick={() => formatHeading('h3')}>
          <Heading3 size={16} /><span className="text">Heading 3</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'quote' ? 'active' : ''}`} onClick={formatQuote}>
          <Quote size={16} /><span className="text">Quote</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'code' ? 'active' : ''}`} onClick={formatCode}>
          <Code size={16} /><span className="text">Code Block</span>
        </DropDownItem>
      </DropDown>

      <DropDown
        buttonLabel={fontSize}
        buttonClassName="format-btn format-btn-fontsize"
        buttonAriaLabel="Font size"
      >
        {FONT_SIZE_OPTIONS.map((size) => (
          <DropDownItem
            key={size}
            className={`item ${fontSize === size ? 'active' : ''}`}
            onClick={() => applyFontSize(size)}
          >
            <span className="text">{size}</span>
          </DropDownItem>
        ))}
      </DropDown>

      <div className="separator" />

      <button
        title="Bold (Ctrl+B)"
        onClick={() => handleFormat(FORMAT_TEXT_COMMAND, 'bold')}
        className={`format-btn ${isBold ? 'active' : ''}`}
      >
        <Bold size={16} />
      </button>

      <button
        title="Italic (Ctrl+I)"
        onClick={() => handleFormat(FORMAT_TEXT_COMMAND, 'italic')}
        className={`format-btn ${isItalic ? 'active' : ''}`}
      >
        <Italic size={16} />
      </button>

      <button
        title="Underline (Ctrl+U)"
        onClick={() => handleFormat(FORMAT_TEXT_COMMAND, 'underline')}
        className={`format-btn ${isUnderline ? 'active' : ''}`}
      >
        <Underline size={16} />
      </button>

      <div className="separator" />

      <button
        title="Bullet List"
        onClick={() => handleFormat(INSERT_UNORDERED_LIST_COMMAND)}
        className="format-btn"
      >
        <List size={16} />
      </button>

      <button
        title="Numbered List"
        onClick={() => handleFormat(INSERT_ORDERED_LIST_COMMAND)}
        className="format-btn"
      >
        <ListOrdered size={16} />
      </button>

      <div className="separator" />

      <button
        title="Align Left"
        onClick={() => handleFormat(FORMAT_ELEMENT_COMMAND, 'left')}
        className="format-btn"
      >
        <AlignLeft size={16} />
      </button>

      <button
        title="Align Center"
        onClick={() => handleFormat(FORMAT_ELEMENT_COMMAND, 'center')}
        className="format-btn"
      >
        <AlignCenter size={16} />
      </button>

      <button
        title="Align Right"
        onClick={() => handleFormat(FORMAT_ELEMENT_COMMAND, 'right')}
        className="format-btn"
      >
        <AlignRight size={16} />
      </button>

      <div className="separator" />

      <button
        title="Insert Image"
        onClick={openImageFilePicker}
        className="format-btn"
      >
        <Image size={16} />
      </button>
    </div>
  )
}
