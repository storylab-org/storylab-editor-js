import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND, $getSelection, $isRangeSelection, $createParagraphNode, $isRootOrShadowRoot, SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_CRITICAL } from 'lexical'
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
  Table2,
  User,
  MapPin,
  Package,
  Search,
} from 'lucide-react'
import DropDown, { DropDownItem } from './lexical/ui/DropDown'
import DropdownColorPicker from './lexical/ui/DropdownColorPicker'
import { INSERT_IMAGE_COMMAND } from './lexical/commands'
import { OPEN_FIND_REPLACE_COMMAND } from './lexical/plugins/FindReplacePlugin'
import { useToast } from '@/components/shared/ToastContext'
import InsertTableDialog from './InsertTableDialog'
import './FormattingToolbar.css'

// Maximum image size: 50MB
const MAX_IMAGE_SIZE_MB = 50
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'check' | 'quote' | 'code'

export default function FormattingToolbar() {
  const [editor] = useLexicalComposerContext()
  const { addToast } = useToast()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [hasTextColor, setHasTextColor] = useState(false)
  const [blockType, setBlockType] = useState<BlockType>('paragraph')
  const [fontSize, setFontSize] = useState('15px')
  const [showTableDialog, setShowTableDialog] = useState(false)

  const dispatchCommandWithPayload = useCallback((command: any, payload?: any) => {
    if (payload !== undefined) {
      editor.dispatchCommand(command, payload)
    } else {
      editor.dispatchCommand(command, undefined)
    }
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

  const openFindReplace = useCallback(() => {
    editor.dispatchCommand(OPEN_FIND_REPLACE_COMMAND as any, undefined)
  }, [editor])

  const applyFontSize = useCallback((size: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-size': size })
      }
    })
  }, [editor])

  const applyTextColor = useCallback((color: string) => {
    setTextColor(color)
    setHasTextColor(true)

    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color })
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
          addToast('warning', message)
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
          addToast('error', `Failed to upload image: ${errorMessage}`)
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
        addToast('error', `Error uploading image: ${message}`)
      }
    }
    input.click()
  }, [editor])

  const insertMentionTrigger = useCallback((trigger: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertText(trigger)
      }
    })
  }, [editor])

  const blockTypeLabels: Record<BlockType, string> = {
    paragraph: 'Normal', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
    bullet: 'Bullet List', number: 'Numbered List', check: 'Check List',
    quote: 'Quote', code: 'Code Block',
  }

  const FONT_SIZE_OPTIONS = ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '24px', '28px', '32px']

  const BlockIcon = ({ type }: { type: BlockType }) => {
    if (type === 'h1') return <Heading1 size={18} />
    if (type === 'h2') return <Heading2 size={18} />
    if (type === 'h3') return <Heading3 size={18} />
    if (type === 'quote') return <Quote size={18} />
    if (type === 'code') return <Code size={18} />
    return <Type size={18} />
  }

  // Update toolbar state based on selection
  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      // Update format buttons based on selection (works for both range and collapsed selections)
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      const currentColor = $getSelectionStyleValueForProperty(selection, 'color', '')
      setHasTextColor(currentColor !== '')
      setTextColor(currentColor || '#000000')

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
  }, [])

  // Register update listener
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(updateToolbar)
    })
  }, [editor, updateToolbar])

  // Register selection change command
  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar)
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor, updateToolbar])

  return (
    <div className="formatting-toolbar">
      <button
        title="Undo (Ctrl+Z)"
        onClick={() => dispatchCommandWithPayload(UNDO_COMMAND)}
        className="format-btn"
      >
        <Undo2 size={18} />
      </button>

      <button
        title="Redo (Ctrl+Y)"
        onClick={() => dispatchCommandWithPayload(REDO_COMMAND)}
        className="format-btn"
      >
        <Redo2 size={18} />
      </button>

      <button
        title="Find & Replace (Cmd+F)"
        onClick={openFindReplace}
        className="format-btn"
        aria-label="Find and Replace"
      >
        <Search size={18} />
      </button>

      <div className="separator" />

      <DropDown
        buttonLabel={blockTypeLabels[blockType]}
        buttonIcon={<BlockIcon type={blockType} />}
        buttonClassName="format-btn format-btn-block"
        buttonAriaLabel="Block format"
      >
        <DropDownItem className={`item ${blockType === 'paragraph' ? 'active' : ''}`} onClick={formatParagraph}>
          <Type size={18} /><span className="text">Normal</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'h1' ? 'active' : ''}`} onClick={() => formatHeading('h1')}>
          <Heading1 size={18} /><span className="text">Heading 1</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'h2' ? 'active' : ''}`} onClick={() => formatHeading('h2')}>
          <Heading2 size={18} /><span className="text">Heading 2</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'h3' ? 'active' : ''}`} onClick={() => formatHeading('h3')}>
          <Heading3 size={18} /><span className="text">Heading 3</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'quote' ? 'active' : ''}`} onClick={formatQuote}>
          <Quote size={18} /><span className="text">Quote</span>
        </DropDownItem>
        <DropDownItem className={`item ${blockType === 'code' ? 'active' : ''}`} onClick={formatCode}>
          <Code size={18} /><span className="text">Code Block</span>
        </DropDownItem>
      </DropDown>

      <div className="separator" />

      <button
        title="Bold (Ctrl+B)"
        onClick={() => dispatchCommandWithPayload(FORMAT_TEXT_COMMAND, 'bold')}
        className={`format-btn ${isBold ? 'active' : ''}`}
      >
        <Bold size={18} />
      </button>

      <button
        title="Italic (Ctrl+I)"
        onClick={() => dispatchCommandWithPayload(FORMAT_TEXT_COMMAND, 'italic')}
        className={`format-btn ${isItalic ? 'active' : ''}`}
      >
        <Italic size={18} />
      </button>

      <button
        title="Underline (Ctrl+U)"
        onClick={() => dispatchCommandWithPayload(FORMAT_TEXT_COMMAND, 'underline')}
        className={`format-btn ${isUnderline ? 'active' : ''}`}
      >
        <Underline size={18} />
      </button>

      <DropdownColorPicker
        buttonClassName={`format-btn format-btn-color ${hasTextColor ? 'active' : ''}`}
        buttonAriaLabel="Text color"
        color={textColor}
        onChange={applyTextColor}
        buttonIcon={(
          <span className="color-button-content">
            <span
              className="color-swatch"
              style={{ backgroundColor: textColor }}
              aria-hidden="true"
            />
          </span>
        )}
      />

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
        title="Bullet List"
        onClick={() => dispatchCommandWithPayload(INSERT_UNORDERED_LIST_COMMAND)}
        className="format-btn"
      >
        <List size={18} />
      </button>

      <button
        title="Numbered List"
        onClick={() => dispatchCommandWithPayload(INSERT_ORDERED_LIST_COMMAND)}
        className="format-btn"
      >
        <ListOrdered size={18} />
      </button>

      <div className="separator" />

      <button
        title="Align Left"
        onClick={() => dispatchCommandWithPayload(FORMAT_ELEMENT_COMMAND, 'left')}
        className="format-btn"
      >
        <AlignLeft size={18} />
      </button>

      <button
        title="Align Center"
        onClick={() => dispatchCommandWithPayload(FORMAT_ELEMENT_COMMAND, 'center')}
        className="format-btn"
      >
        <AlignCenter size={18} />
      </button>

      <button
        title="Align Right"
        onClick={() => dispatchCommandWithPayload(FORMAT_ELEMENT_COMMAND, 'right')}
        className="format-btn"
      >
        <AlignRight size={18} />
      </button>

      <div className="separator" />

      <button
        title="Insert Table"
        onClick={() => setShowTableDialog(true)}
        className="format-btn"
      >
        <Table2 size={18} />
      </button>

      <button
        title="Insert Image"
        onClick={openImageFilePicker}
        className="format-btn"
      >
        <Image size={18} />
      </button>

      <DropDown
        buttonLabel="Entity"
        buttonIcon={<User size={18} />}
        buttonClassName="format-btn format-btn-entity"
        buttonAriaLabel="Insert entity mention"
      >
        <DropDownItem className="item entity-dropdown-item" onClick={() => insertMentionTrigger('@')}>
          <User size={16} /><span className="text">@ (Person)</span>
        </DropDownItem>
        <DropDownItem className="item entity-dropdown-item" onClick={() => insertMentionTrigger('#')}>
          <MapPin size={16} /><span className="text"># (Location)</span>
        </DropDownItem>
        <DropDownItem className="item entity-dropdown-item" onClick={() => insertMentionTrigger('!')}>
          <Package size={16} /><span className="text">! (Item)</span>
        </DropDownItem>
      </DropDown>

      {showTableDialog && <InsertTableDialog onClose={() => setShowTableDialog(false)} />}
    </div>
  )
}
