import { ReactElement } from 'react'
import {
  DOMConversionMap,
  DecoratorNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
} from 'lexical'

export interface SerializedImageNode extends SerializedLexicalNode {
  type: 'image'
  cid: string
  alt: string
  mimeType: string
  version: 1
}

export class ImageNode extends DecoratorNode<ReactElement> {
  __cid: string
  __alt: string
  __mimeType: string

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__cid, node.__alt, node.__mimeType, node.__key)
  }

  constructor(
    cid: string,
    alt: string,
    mimeType: string,
    key?: NodeKey
  ) {
    super(key)
    this.__cid = cid
    this.__alt = alt
    this.__mimeType = mimeType
  }

  static importJSON(serialised: SerializedImageNode): ImageNode {
    return $createImageNode(serialised.cid, serialised.alt, serialised.mimeType)
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      cid: this.__cid,
      alt: this.__alt,
      mimeType: this.__mimeType,
      version: 1,
    }
  }

  createDOM(): HTMLElement {
    return document.createElement('span')
  }

  updateDOM(): false {
    return false
  }

  decorate(): ReactElement {
    return (
      <img
        src={`http://localhost:3000/images/${this.__cid}`}
        alt={this.__alt}
        style={{ maxWidth: '100%', display: 'inline-block' }}
        draggable={false}
      />
    )
  }

  isInline(): true {
    return true
  }

  static importDOM(): DOMConversionMap | null {
    return null
  }

  getCID(): string {
    return this.__cid
  }

  getAlt(): string {
    return this.__alt
  }

  getMimeType(): string {
    return this.__mimeType
  }
}

export function $createImageNode(
  cid: string,
  alt: string,
  mimeType: string
): ImageNode {
  return new ImageNode(cid, alt, mimeType)
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode
}
