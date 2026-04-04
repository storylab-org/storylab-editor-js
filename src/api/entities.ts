import { User, MapPin, Package } from 'lucide-react'

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

// Constants for entity UI
export const BADGE_ICONS: Record<EntityType, typeof User> = {
  character: User,
  location: MapPin,
  item: Package,
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  character: 'Person',
  location: 'Location',
  item: 'Item',
}

export const ENTITY_BADGE_COLORS: Record<EntityType, { border: string; bg: string; text: string }> = {
  character: {
    border: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.05)',
    text: '#7c3aed',
  },
  location: {
    border: '#0d9488',
    bg: 'rgba(13, 148, 136, 0.05)',
    text: '#0d9488',
  },
  item: {
    border: '#b45309',
    bg: 'rgba(180, 83, 9, 0.05)',
    text: '#b45309',
  },
}

export const ENTITY_CHIP_COLORS: Record<EntityType, string> = {
  character: '#7c3aed',
  location: '#0d9488',
  item: '#b45309',
}

const BASE_URL = 'http://localhost:3000'

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as unknown as T
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

export async function listEntities(type?: EntityType): Promise<Entity[]> {
  const url = new URL(`${BASE_URL}/entities`)
  if (type) {
    url.searchParams.set('type', type)
  }
  const response = await fetch(url.toString())
  return handleResponse<Entity[]>(response)
}

export async function getEntity(id: string): Promise<Entity> {
  const response = await fetch(`${BASE_URL}/entities/${id}`)
  return handleResponse<Entity>(response)
}

export async function createEntity(name: string, type: EntityType, description?: string, tags?: string[]): Promise<Entity> {
  const response = await fetch(`${BASE_URL}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type, description, tags }),
  })
  return handleResponse<Entity>(response)
}

export async function updateEntity(id: string, patch: Partial<Entity>): Promise<Entity> {
  const response = await fetch(`${BASE_URL}/entities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return handleResponse<Entity>(response)
}

export async function deleteEntity(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/entities/${id}`, { method: 'DELETE' })
  await handleResponse<void>(response)
}
