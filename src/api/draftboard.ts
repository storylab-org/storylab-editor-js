export interface OverviewData {
  content: string
  updatedAt: string
}

export type CardShape = 'rectangle' | 'circle' | 'diamond' | 'triangle'

export interface BoardCard {
  id: string
  shape: CardShape
  x: number
  y: number
  // Content
  title?: string
  body?: string       // only used by rectangle
  color?: string
  // Chapter link — optional on any shape
  chapterId?: string | null
  chapterName?: string
  // Entity link — optional, makes this an entity card
  entityId?: string | null
  entityType?: 'character' | 'location' | 'item' | null
  // Linked entities — multiple entities pinned to a shape card via drag
  linkedEntities?: Array<{
    id: string
    name: string
    type: 'character' | 'location' | 'item'
  }>
}

export interface BoardData {
  cards: BoardCard[]
  updatedAt: string
}

export interface StoryPath {
  id: string
  fromCardId: string
  toCardId: string
  label?: string
  createdAt: string
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    ;(error as any).status = response.status
    throw error
  }

  if (response.status === 204) {
    return undefined as any
  }

  return response.json() as Promise<T>
}

export async function getOverview(): Promise<OverviewData> {
  const response = await fetch(`${API_BASE}/overview`)
  return handleResponse<OverviewData>(response)
}

export async function putOverview(content: string): Promise<OverviewData> {
  const response = await fetch(`${API_BASE}/overview`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  return handleResponse<OverviewData>(response)
}

export async function getBoard(): Promise<BoardData> {
  const response = await fetch(`${API_BASE}/board`)
  return handleResponse<BoardData>(response)
}

export async function putBoard(boardData: BoardData): Promise<BoardData> {
  const response = await fetch(`${API_BASE}/board`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(boardData)
  })
  return handleResponse<BoardData>(response)
}

export async function addCard(card: Omit<BoardCard, 'id'>): Promise<BoardCard> {
  const response = await fetch(`${API_BASE}/board/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card)
  })
  return handleResponse<BoardCard>(response)
}

export async function updateCard(id: string, patch: Partial<BoardCard>): Promise<BoardCard> {
  const response = await fetch(`${API_BASE}/board/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  })
  return handleResponse<BoardCard>(response)
}

export async function updateCardPosition(id: string, x: number, y: number): Promise<BoardCard> {
  const response = await fetch(`${API_BASE}/board/cards/${id}/position`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y })
  })
  return handleResponse<BoardCard>(response)
}

export async function deleteCard(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/board/cards/${id}`, {
    method: 'DELETE'
  })
  return handleResponse<void>(response)
}

export async function listPaths(): Promise<StoryPath[]> {
  const response = await fetch(`${API_BASE}/paths`)
  return handleResponse<StoryPath[]>(response)
}

export async function createPath(
  fromCardId: string,
  toCardId: string,
  label?: string
): Promise<StoryPath> {
  const response = await fetch(`${API_BASE}/paths`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromCardId, toCardId, label })
  })
  return handleResponse<StoryPath>(response)
}

export async function deletePath(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/paths/${id}`, {
    method: 'DELETE'
  })
  return handleResponse<void>(response)
}
