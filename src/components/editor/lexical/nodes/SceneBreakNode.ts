import { DecoratorNode, SerializedLexicalNode, NodeKey } from 'lexical'
import React from 'react'

export interface SerializedSceneBreakNode extends SerializedLexicalNode {
  type: 'scene-break'
  version: 1
}

export class SceneBreakNode extends DecoratorNode<React.ReactElement> {
  constructor(key?: NodeKey) {
    super(key)
  }

  static getType(): string {
    return 'scene-break'
  }

  static clone(node: SceneBreakNode): SceneBreakNode {
    return new SceneBreakNode(node.__key)
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'scene-break-node'
    return div
  }

  updateDOM(): false {
    return false
  }

  isInline(): false {
    return false
  }

  decorate(): React.ReactElement {
    return React.createElement('div', {
      className: 'scene-break-container',
      children: React.createElement('span', {
        className: 'scene-break-text',
        children: '* * *',
      }),
    })
  }

  exportJSON(): SerializedSceneBreakNode {
    return {
      type: 'scene-break',
      version: 1,
    }
  }

  static importJSON(_serialisedNode: SerializedSceneBreakNode): SceneBreakNode {
    return $createSceneBreakNode()
  }

  static importDOM(): null {
    return null
  }
}

export function $createSceneBreakNode(): SceneBreakNode {
  return new SceneBreakNode()
}
