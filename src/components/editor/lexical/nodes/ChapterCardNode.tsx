import React from 'react'
import { DecoratorNode, SerializedLexicalNode, LexicalNode, NodeKey } from 'lexical'

export type ChapterCardStyle = 'default' | 'draft' | 'revision' | 'final'

interface SerializedChapterCardNode extends SerializedLexicalNode {
  type: 'chapter-card'
  version: 1
  chapterId: string | null
  chapterName: string
  style: ChapterCardStyle
}

export class ChapterCardNode extends DecoratorNode<React.ReactElement> {
  private __chapterId: string | null
  private __chapterName: string
  private __style: ChapterCardStyle

  constructor(
    chapterId: string | null = null,
    chapterName: string = 'Untitled Card',
    style: ChapterCardStyle = 'default',
    key?: NodeKey
  ) {
    super(key)
    this.__chapterId = chapterId
    this.__chapterName = chapterName
    this.__style = style
  }

  static getType(): string {
    return 'chapter-card'
  }

  static clone(node: ChapterCardNode): ChapterCardNode {
    return new ChapterCardNode(
      node.__chapterId,
      node.__chapterName,
      node.__style,
      node.__key
    )
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'chapter-card-node'
    return div
  }

  updateDOM(): false {
    return false
  }

  isInline(): false {
    return false
  }

  decorate(editor: any): React.ReactElement {
    return <ChapterCardComponent node={this} editor={editor} />
  }

  exportJSON(): SerializedChapterCardNode {
    return {
      type: 'chapter-card',
      version: 1,
      chapterId: this.__chapterId,
      chapterName: this.__chapterName,
      style: this.__style,
    }
  }

  static importJSON(serializedNode: SerializedChapterCardNode): ChapterCardNode {
    return $createChapterCardNode(
      serializedNode.chapterId,
      serializedNode.chapterName,
      serializedNode.style
    )
  }

  static importDOM(): null {
    return null
  }

  getChapterId(): string | null {
    return this.__chapterId
  }

  setChapterId(id: string | null): void {
    this.getWritable().__chapterId = id
  }

  getChapterName(): string {
    return this.__chapterName
  }

  setChapterName(name: string): void {
    this.getWritable().__chapterName = name
  }

  getStyle(): ChapterCardStyle {
    return this.__style
  }

  setStyle(style: ChapterCardStyle): void {
    this.getWritable().__style = style
  }
}

interface ChapterCardComponentProps {
  node: ChapterCardNode
  editor: any
}

function ChapterCardComponent({ node }: ChapterCardComponentProps): React.ReactElement {
  const [style] = React.useState<ChapterCardStyle>(node.getStyle())

  const handleConnectDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('draft-board-from-chapter-id', node.getChapterId() || '')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const fromChapterId = e.dataTransfer.getData('draft-board-from-chapter-id')
    if (fromChapterId && fromChapterId !== node.getChapterId()) {
      const event = new CustomEvent('draft-board-connect-drop', {
        detail: { fromChapterId, toChapterId: node.getChapterId() }
      })
      document.dispatchEvent(event)
    }
  }

  const handleCardClick = () => {
    // When card is clicked in connecting mode, send connect-target event
    const event = new CustomEvent('draft-board-connect-target', {
      detail: { chapterId: node.getChapterId() }
    })
    document.dispatchEvent(event)
  }

  const styleColours: Record<ChapterCardStyle, { bg: string; border: string }> = {
    default: { bg: '#ffffff', border: '#e5e5e5' },
    draft: { bg: '#fff9e6', border: '#ffcc00' },
    revision: { bg: '#fff0e6', border: '#ff9900' },
    final: { bg: '#e6f3ff', border: '#0066cc' },
  }

  const colours = styleColours[style]

  return (
    <div
      className="chapter-card-component"
      data-lexical-decorator="true"
      onClick={handleCardClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        background: colours.bg,
        border: `1px solid ${colours.border}`,
        borderLeft: `4px solid ${colours.border}`,
        borderRadius: '6px',
        padding: '12px 16px',
        margin: '8px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f0f0f', marginBottom: '4px' }}>
          {node.getChapterName() || 'Untitled Card'}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {node.getChapterId() ? `ID: ${node.getChapterId()}` : 'No chapter linked'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        <button
          draggable
          onDragStart={handleConnectDragStart}
          title="Drag to another chapter to connect"
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            background: '#ff6600',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'grab',
            fontWeight: 500,
          }}
        >
          🔗
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            const event = new CustomEvent('openChapter', { detail: { chapterId: node.getChapterId() } })
            document.dispatchEvent(event)
          }}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: node.getChapterId() ? 'pointer' : 'not-allowed',
            opacity: node.getChapterId() ? 1 : 0.5,
          }}
          disabled={!node.getChapterId()}
        >
          Open
        </button>
      </div>
    </div>
  )
}

export function $createChapterCardNode(
  chapterId: string | null = null,
  chapterName: string = 'Untitled Card',
  style: ChapterCardStyle = 'default'
): ChapterCardNode {
  return new ChapterCardNode(chapterId, chapterName, style)
}

export function $isChapterCardNode(node: LexicalNode | null | undefined): node is ChapterCardNode {
  return node instanceof ChapterCardNode
}
