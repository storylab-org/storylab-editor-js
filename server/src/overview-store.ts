import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

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

export interface OverviewStore {
  getOverview(): Promise<OverviewData>
  putOverview(content: string): Promise<OverviewData>
  getBoard(): Promise<BoardData>
  putBoard(cards: BoardCard[]): Promise<BoardData>
  addCard(card: Omit<BoardCard, 'id'>): Promise<BoardCard>
  updateCard(id: string, patch: Partial<BoardCard>): Promise<BoardCard>
  deleteCard(id: string): Promise<void>
  listPaths(): Promise<StoryPath[]>
  createPath(fromCardId: string, toCardId: string, label?: string): Promise<StoryPath>
  deletePath(id: string): Promise<void>
}

export function createOverviewStore(dataDir: string): OverviewStore {
  const overviewPath = join(dataDir, 'overview.json')
  const boardPath = join(dataDir, 'board.json')
  const pathsPath = join(dataDir, 'paths.json')

  const ensureDir = async () => {
    await mkdir(dataDir, { recursive: true })
  }

  const getOverview = async (): Promise<OverviewData> => {
    await ensureDir()

    try {
      const data = await readFile(overviewPath, 'utf-8')
      return JSON.parse(data) as OverviewData
    } catch {
      // File doesn't exist yet, return empty content
      return { content: '', updatedAt: new Date().toISOString() }
    }
  }

  const putOverview = async (content: string): Promise<OverviewData> => {
    await ensureDir()

    const overviewData: OverviewData = {
      content,
      updatedAt: new Date().toISOString()
    }

    await writeFile(overviewPath, JSON.stringify(overviewData, null, 2), 'utf-8')
    return overviewData
  }

  const getBoard = async (): Promise<BoardData> => {
    await ensureDir()

    try {
      const data = await readFile(boardPath, 'utf-8')
      return JSON.parse(data) as BoardData
    } catch {
      // File doesn't exist yet, return empty board
      return { cards: [], updatedAt: new Date().toISOString() }
    }
  }

  const putBoard = async (cards: BoardCard[]): Promise<BoardData> => {
    await ensureDir()

    const boardData: BoardData = {
      cards,
      updatedAt: new Date().toISOString()
    }

    await writeFile(boardPath, JSON.stringify(boardData, null, 2), 'utf-8')
    return boardData
  }

  const addCard = async (card: Omit<BoardCard, 'id'>): Promise<BoardCard> => {
    const board = await getBoard()
    const newCard: BoardCard = {
      ...card,
      id: randomUUID()
    }

    const cards = Array.isArray(board.cards) ? board.cards : []
    cards.push(newCard)
    await putBoard(cards)
    return newCard
  }

  const updateCard = async (id: string, patch: Partial<BoardCard>): Promise<BoardCard> => {
    const board = await getBoard()
    const cards = Array.isArray(board.cards) ? board.cards : []
    const index = cards.findIndex(c => c.id === id)

    if (index === -1) {
      const error = new Error(`Card not found: ${id}`)
      ;(error as any).statusCode = 404
      throw error
    }

    cards[index] = { ...cards[index], ...patch, id }
    await putBoard(cards)
    return cards[index]
  }

  const deleteCard = async (id: string): Promise<void> => {
    const board = await getBoard()
    const cards = Array.isArray(board.cards) ? board.cards : []
    const index = cards.findIndex(c => c.id === id)

    if (index === -1) {
      const error = new Error(`Card not found: ${id}`)
      ;(error as any).statusCode = 404
      throw error
    }

    cards.splice(index, 1)
    await putBoard(cards)
  }

  const listPaths = async (): Promise<StoryPath[]> => {
    await ensureDir()

    try {
      const data = await readFile(pathsPath, 'utf-8')
      return JSON.parse(data) as StoryPath[]
    } catch {
      // File doesn't exist yet, return empty array
      return []
    }
  }

  const createPath = async (
    fromCardId: string,
    toCardId: string,
    label?: string
  ): Promise<StoryPath> => {
    await ensureDir()

    const paths = await listPaths()
    const newPath: StoryPath = {
      id: randomUUID(),
      fromCardId,
      toCardId,
      label,
      createdAt: new Date().toISOString()
    }

    paths.push(newPath)
    await writeFile(pathsPath, JSON.stringify(paths, null, 2), 'utf-8')
    return newPath
  }

  const deletePath = async (id: string): Promise<void> => {
    await ensureDir()

    const paths = await listPaths()
    const index = paths.findIndex(p => p.id === id)

    if (index === -1) {
      const error = new Error(`Path not found: ${id}`)
      ;(error as any).statusCode = 404
      throw error
    }

    paths.splice(index, 1)
    await writeFile(pathsPath, JSON.stringify(paths, null, 2), 'utf-8')
  }

  return {
    getOverview,
    putOverview,
    getBoard,
    putBoard,
    addCard,
    updateCard,
    deleteCard,
    listPaths,
    createPath,
    deletePath
  }
}
