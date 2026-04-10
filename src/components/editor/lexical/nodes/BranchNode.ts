import { TextNode, NodeKey, EditorConfig, SerializedTextNode } from 'lexical';
import { $applyNodeReplacement } from 'lexical';

export class BranchNode extends TextNode {
  __color: string;

  constructor(text: string, color: string, key?: NodeKey) {
    super(text, key);
    this.__color = color;
  }

  static getType(): string {
    return 'colored';
  }

  static clone(node: BranchNode): BranchNode {
    return new BranchNode(node.__text, node.__color, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.color = this.__color;
    return element;
  }

  updateDOM(
    prevNode: BranchNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const isUpdated = super.updateDOM(prevNode as unknown as this, dom, config);
    if (prevNode.__color !== this.__color) {
      dom.style.color = this.__color;
    }
    return isUpdated;
  }

  static importJSON(serialisedNode: SerializedBranchNode): BranchNode {
    const node = new BranchNode(serialisedNode.text, serialisedNode.color);
    node.setFormat(serialisedNode.format);
    node.setDetail(serialisedNode.detail);
    node.setMode(serialisedNode.mode);
    node.setStyle(serialisedNode.style);
    return node;
  }

  exportJSON(): SerializedBranchNode {
    return {
      ...super.exportJSON(),
      color: this.__color,
      type: 'colored',
    };
  }
}

export interface SerializedBranchNode extends SerializedTextNode {
  color: string;
  type: 'colored';
}

export function $createBranchNode(text: string, color: string): BranchNode {
  return $applyNodeReplacement(new BranchNode(text, color));
}

export function $isBranchNode(node: any): boolean {
  return node instanceof BranchNode;
}
