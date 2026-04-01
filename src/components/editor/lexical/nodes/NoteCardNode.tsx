import React from 'react'
import { DecoratorNode, SerializedLexicalNode, LexicalNode, NodeKey } from 'lexical'

interface SerializedNoteCardNode extends SerializedLexicalNode {
  type: 'note-card'
  version: 1
  title: string
  body: string
  color: string
}

export class NoteCardNode extends DecoratorNode<React.ReactElement> {
  private __title: string
  private __body: string
  private __color: string

  constructor(
    title: string = 'Note',
    body: string = '',
    color: string = '#fff9e6',
    key?: NodeKey
  ) {
    super(key)
    this.__title = title
    this.__body = body
    this.__color = color
  }

  static getType(): string {
    return 'note-card'
  }

  static clone(node: NoteCardNode): NoteCardNode {
    return new NoteCardNode(
      node.__title,
      node.__body,
      node.__color,
      node.__key
    )
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'note-card-node'
    return div
  }

  updateDOM(): false {
    return false
  }

  isInline(): false {
    return false
  }

  decorate(editor: any): React.ReactElement {
    return <NoteCardComponent node={this} editor={editor} />
  }

  exportJSON(): SerializedNoteCardNode {
    return {
      type: 'note-card',
      version: 1,
      title: this.__title,
      body: this.__body,
      color: this.__color,
    }
  }

  static importJSON(serializedNode: SerializedNoteCardNode): NoteCardNode {
    return $createNoteCardNode(
      serializedNode.title,
      serializedNode.body,
      serializedNode.color
    )
  }

  static importDOM(): null {
    return null
  }

  getTitle(): string {
    return this.__title
  }

  setTitle(title: string): void {
    this.getWritable().__title = title
  }

  getBody(): string {
    return this.__body
  }

  setBody(body: string): void {
    this.getWritable().__body = body
  }

  getColor(): string {
    return this.__color
  }

  setColor(color: string): void {
    this.getWritable().__color = color
  }
}

interface NoteCardComponentProps {
  node: NoteCardNode
  editor: any
}

const COLOUR_PRESETS = [
  '#fff9e6', // yellow
  '#f9e6ff', // pink
  '#e6f9ff', // blue
  '#e6fff9', // mint
  '#ffe6e6', // red
  '#f0e6ff', // purple
]

function NoteCardComponent({ node, editor }: NoteCardComponentProps): React.ReactElement {
  const [title, setTitle] = React.useState(node.getTitle())
  const [body, setBody] = React.useState(node.getBody())
  const [color, setColor] = React.useState(node.getColor())
  const [showColourPicker, setShowColourPicker] = React.useState(false)

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    editor.update(() => {
      node.getWritable().setTitle(newTitle)
    })
  }

  const handleBodyChange = (newBody: string) => {
    setBody(newBody)
    editor.update(() => {
      node.getWritable().setBody(newBody)
    })
  }

  const handleColourChange = (newColour: string) => {
    setColor(newColour)
    setShowColourPicker(false)
    editor.update(() => {
      node.getWritable().setColor(newColour)
    })
  }

  return (
    <div
      className="note-card-component"
      data-lexical-decorator="true"
      style={{
        background: color,
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '6px',
        padding: '12px',
        margin: '8px 0',
        minWidth: '200px',
        maxWidth: '400px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        position: 'relative',
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Note title"
        style={{
          display: 'block',
          width: '100%',
          padding: '4px 0',
          fontSize: '14px',
          fontWeight: 500,
          border: 'none',
          background: 'transparent',
          marginBottom: '8px',
          boxSizing: 'border-box',
        }}
      />

      <textarea
        value={body}
        onChange={(e) => handleBodyChange(e.target.value)}
        placeholder="Write your note..."
        style={{
          display: 'block',
          width: '100%',
          minHeight: '80px',
          padding: '4px',
          fontSize: '13px',
          border: 'none',
          background: 'transparent',
          resize: 'vertical',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowColourPicker(!showColourPicker)}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            background: 'rgba(0, 0, 0, 0.1)',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          🎨
        </button>

        {showColourPicker && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {COLOUR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => handleColourChange(c)}
                style={{
                  width: '20px',
                  height: '20px',
                  background: c,
                  border: color === c ? '2px solid #0f0f0f' : '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function $createNoteCardNode(
  title: string = 'Note',
  body: string = '',
  color: string = '#fff9e6'
): NoteCardNode {
  return new NoteCardNode(title, body, color)
}

export function $isNoteCardNode(node: LexicalNode | null | undefined): node is NoteCardNode {
  return node instanceof NoteCardNode
}
