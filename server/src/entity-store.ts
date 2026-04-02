import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export type EntityType = 'character' | 'location' | 'item'

export interface Entity {
  id: string
  name: string
  type: EntityType
  description?: string
  createdAt: string
  updatedAt: string
}

const getDataDir = () => process.env.STORYLAB_DATA_DIR || join(process.env.HOME || '/tmp', '.storylab')
const getEntityPath = () => join(getDataDir(), 'entities.json')

// Mock seed data
const SEED_ENTITIES: Entity[] = [
  // Characters
  { id: randomUUID(), name: 'Arya Stark', type: 'character', description: 'A skilled assassin and warrior', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Jon Snow', type: 'character', description: 'Lord Commander of the Night\'s Watch', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Daenerys Targaryen', type: 'character', description: 'Dragon rider and Mother of Dragons', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Tyrion Lannister', type: 'character', description: 'The Imp, a clever politician', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Cersei Lannister', type: 'character', description: 'Queen of the Six Kingdoms', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Locations
  { id: randomUUID(), name: 'Winterfell', type: 'location', description: 'Seat of House Stark in the North', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'King\'s Landing', type: 'location', description: 'Capital of the Six Kingdoms', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Dragonstone', type: 'location', description: 'Volcanic island fortress', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'The Wall', type: 'location', description: 'Ancient fortification protecting the realm', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Casterly Rock', type: 'location', description: 'Seat of House Lannister', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Items
  { id: randomUUID(), name: 'Dragonsteel', type: 'item', description: 'Legendary metal that kills White Walkers', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Valyrian Steel', type: 'item', description: 'Ancient high-quality steel', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Iron Throne', type: 'item', description: 'Seat of power in King\'s Landing', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Needle', type: 'item', description: 'Arya\'s Valyrian steel sword', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Crown of the Dragon', type: 'item', description: 'Symbol of royal authority', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

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
      // File doesn't exist or is invalid — seed with mock data
      SEED_ENTITIES.forEach((entity) => this.entities.set(entity.id, entity))
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

  create(name: string, type: EntityType, description?: string): Entity {
    const id = randomUUID()
    const now = new Date().toISOString()
    const entity: Entity = { id, name, type, description, createdAt: now, updatedAt: now }
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
