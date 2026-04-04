import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export type EntityType = 'character' | 'location' | 'item'

export interface Entity {
  id: string
  name: string
  type: EntityType
  description?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

const getDataDir = () => process.env.STORYLAB_DATA_DIR || join(process.env.HOME || '/tmp', '.storylab')
const getEntityPath = () => join(getDataDir(), 'entities.json')


export class EntityStore {
  private entities: Map<string, Entity>

  constructor() {
    this.entities = new Map()
    this.load()
  }

  private load(): void {
    try {
      const data = readFileSync(getEntityPath(), 'utf-8')
      const parsed: Entity[] = JSON.parse(data)
      parsed.forEach((entity) => this.entities.set(entity.id, entity))
    } catch {
      // File doesn't exist or is invalid — start empty
      this.save()
    }
  }

  private save(): void {
    const dataDir = getDataDir()
    mkdirSync(dataDir, { recursive: true })
    const entities = Array.from(this.entities.values())
    writeFileSync(getEntityPath(), JSON.stringify(entities, null, 2), 'utf-8')
  }

  list(type?: EntityType): Entity[] {
    const entities = Array.from(this.entities.values())
    if (type) {
      return entities.filter((e) => e.type === type)
    }
    return entities
  }

  get(id: string): Entity {
    const entity = this.entities.get(id)
    if (!entity) throw new Error(`Entity not found: ${id}`)
    return entity
  }

  create(name: string, type: EntityType, description?: string, tags?: string[]): Entity {
    const id = randomUUID()
    const now = new Date().toISOString()
    const entity: Entity = { id, name, type, description, tags, createdAt: now, updatedAt: now }
    this.entities.set(id, entity)
    this.save()
    return entity
  }

  update(id: string, patch: Partial<Entity>): Entity {
    const entity = this.get(id)
    const updated: Entity = {
      ...entity,
      ...patch,
      id: entity.id, // prevent ID changes
      createdAt: entity.createdAt, // prevent creation date changes
      updatedAt: new Date().toISOString(),
    }
    this.entities.set(id, updated)
    this.save()
    return updated
  }

  delete(id: string): void {
    this.get(id) // throws if not found
    this.entities.delete(id)
    this.save()
  }
}

export const entityStore = new EntityStore()
