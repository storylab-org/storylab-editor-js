import { ReactElement } from 'react'
import {
  DOMConversionMap,
  DecoratorNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
} from 'lexical'
import ImageComponent from './ImageComponent'

export interface SerializedImageNode extends SerializedLexicalNode {
  type: 'image'
  cid: string
  alt: string
  mimeType: string
  width?: number
  version: 1
}

export class ImageNode extends DecoratorNode<ReactElement> {
  __cid: string
  __alt: string
  __mimeType: string
  __width: number | undefined

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__cid,
      node.__alt,
      node.__mimeType,
      node.__width,
      node.__key
    )
  }

  constructor(
    cid: string,
    alt: string,
    mimeType: string,
    width?: number,
    key?: NodeKey
  ) {
    super(key)
    this.__cid = cid
    this.__alt = alt
    this.__mimeType = mimeType
    this.__width = width
  }

  static importJSON(serialised: SerializedImageNode): ImageNode {
    return $createImageNode(
      serialised.cid,
      serialised.alt,
      serialised.mimeType,
      serialised.width
    )
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      cid: this.__cid,
      alt: this.__alt,
      mimeType: this.__mimeType,
      width: this.__width,
      version: 1,
    }
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'editor-image'
    return span
  }

  updateDOM(): false {
    return false
  }

  setWidth(width: number | undefined): void {
    this.getWritable().__width = width
  }

  decorate(): ReactElement {
    return (
      <ImageComponent
        nodeKey={this.__key}
        src={`http://localhost:3000/images/${this.__cid}`}
        alt={this.__alt}
        width={this.__width}
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
  mimeType: string,
  width?: number
): ImageNode {
  return new ImageNode(cid, alt, mimeType, width)
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode
}
