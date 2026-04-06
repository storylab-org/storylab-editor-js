import { ElementNode, SerializedElementNode, LexicalNode, NodeKey } from 'lexical'
import { AnnotationCategory } from '@/api/annotations'

export interface SerializedAnnotationNode extends SerializedElementNode {
  type: 'annotation'
  version: 1
  markId: string
  category: AnnotationCategory
}

export class AnnotationNode extends ElementNode {
  __markId: string
  __category: AnnotationCategory

  constructor(markId: string, category: AnnotationCategory, key?: NodeKey) {
    super(key)
    this.__markId = markId
    this.__category = category
  }

  static getType(): string {
    return 'annotation'
  }

  static clone(node: AnnotationNode): AnnotationNode {
    return new AnnotationNode(node.__markId, node.__category, node.__key)
  }

  isInline(): boolean {
    return true
  }

  isIsolated(): boolean {
    return false
  }

  canBeEmpty(): boolean {
    return false
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span')
    element.className = `annotation-mark annotation-mark--${this.__category}`
    element.setAttribute('data-mark-id', this.__markId)
    return element
  }

  updateDOM(prevNode: AnnotationNode, dom: HTMLElement): boolean {
    if (prevNode.__category !== this.__category) {
      dom.className = `annotation-mark annotation-mark--${this.__category}`
      dom.setAttribute('data-mark-id', this.__markId)
    }
    if (prevNode.__markId !== this.__markId) {
      dom.setAttribute('data-mark-id', this.__markId)
    }
    return false
  }

  getMarkId(): string {
    return this.__markId
  }

  getCategory(): AnnotationCategory {
    return this.__category
  }

  exportJSON(): SerializedAnnotationNode {
    return {
      ...super.exportJSON(),
      type: 'annotation',
      version: 1,
      markId: this.__markId,
      category: this.__category,
    }
  }

  static importJSON(serialisedNode: SerializedAnnotationNode): AnnotationNode {
    return $createAnnotationNode(serialisedNode.markId, serialisedNode.category)
  }

  static importDOM(): null {
    return null
  }
}

export function $createAnnotationNode(markId: string, category: AnnotationCategory): AnnotationNode {
  return new AnnotationNode(markId, category)
}

export function $isAnnotationNode(node: LexicalNode): node is AnnotationNode {
  return node instanceof AnnotationNode
}
