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
