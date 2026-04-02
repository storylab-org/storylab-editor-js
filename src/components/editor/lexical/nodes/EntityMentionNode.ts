import { TextNode, SerializedTextNode, LexicalNode, NodeKey } from 'lexical'

export type EntityType = 'character' | 'location' | 'item'

export interface SerializedEntityMentionNode extends SerializedTextNode {
  type: 'entity-mention'
  version: 1
  entityId: string
  entityType: EntityType
  entityName: string
}

export class EntityMentionNode extends TextNode {
  __entityId: string
  __entityType: EntityType
  __entityName: string

  constructor(entityId: string, entityType: EntityType, entityName: string, key?: NodeKey) {
    super(entityName, key)
    this.__entityId = entityId
    this.__entityType = entityType
    this.__entityName = entityName
  }

  static getType(): string {
    return 'entity-mention'
  }

  static clone(node: EntityMentionNode): EntityMentionNode {
    return new EntityMentionNode(node.__entityId, node.__entityType, node.__entityName, node.__key)
  }

  isInline(): boolean {
    return true
  }

  isSegmented(): boolean {
    return true
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span')
    element.className = `entity-mention entity-mention--${this.__entityType}`
    element.textContent = this.__entityName
    element.setAttribute('data-entity-id', this.__entityId)
    element.setAttribute('data-entity-type', this.__entityType)
    return element
  }

  updateDOM(prevNode: EntityMentionNode, dom: HTMLElement): boolean {
    if (prevNode.__entityType !== this.__entityType) {
      dom.className = `entity-mention entity-mention--${this.__entityType}`
      dom.setAttribute('data-entity-type', this.__entityType)
    }
    if (prevNode.__entityName !== this.__entityName) {
      dom.textContent = this.__entityName
    }
    if (prevNode.__entityId !== this.__entityId) {
      dom.setAttribute('data-entity-id', this.__entityId)
    }
    return false
  }

  getEntityId(): string {
    return this.__entityId
  }

  getEntityType(): EntityType {
    return this.__entityType
  }

  getEntityName(): string {
    return this.__entityName
  }

  exportJSON(): SerializedEntityMentionNode {
    return {
      ...super.exportJSON(),
      type: 'entity-mention',
      version: 1,
      entityId: this.__entityId,
      entityType: this.__entityType,
      entityName: this.__entityName,
    }
  }

  static importJSON(serialisedNode: SerializedEntityMentionNode): EntityMentionNode {
    return $createEntityMentionNode(serialisedNode.entityId, serialisedNode.entityType, serialisedNode.entityName)
  }

  static importDOM(): null {
    return null
  }
}

export function $createEntityMentionNode(entityId: string, entityType: EntityType, entityName: string): EntityMentionNode {
  return new EntityMentionNode(entityId, entityType, entityName)
}

export function $isEntityMentionNode(node: LexicalNode): node is EntityMentionNode {
  return node instanceof EntityMentionNode
}
