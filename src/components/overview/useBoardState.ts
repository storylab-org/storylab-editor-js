import { useState, useCallback, useEffect, useRef } from 'react'
import { DragEndEvent } from '@dnd-kit/core'
import {
  getBoard,
  addCard,
  updateCard,
  updateCardPosition,
  deleteCard,
  listPaths,
  createPath,
  deletePath,
  type BoardCard,
  type BoardData,
  type StoryPath,
  type CardShape,
} from '@/api/overview'

const COLOUR_PRESETS = ['#fff9e6', '#f9e6ff', '#e6f9ff', '#e6fff9', '#ffe6e6', '#f0e6ff']

interface UseBoardStateReturn {
  cards: BoardCard[]
  paths: StoryPath[]
  isLoading: boolean
  error: string | null
  connectingFromCardId: string | null
  rewiringArrow: { pathId: string; endpoint: 'from' | 'to' } | null

  handleDragEnd: (event: DragEndEvent) => Promise<void>
  handleAddCard: (shape: CardShape) => Promise<void>
  handleDeleteCard: (id: string) => Promise<void>
  handleUpdateCard: (id: string, patch: Partial<BoardCard>) => void
  handleDeletePath: (id: string) => Promise<void>
  handleStartConnect: (fromCardId: string) => void
  handleConnectTo: (toCardId: string) => Promise<void>
  handleCancelConnect: () => void
  handleStartRewiringArrow: (pathId: string, endpoint: 'from' | 'to') => void
  handleEndRewiringArrow: (toCardId: string | null) => Promise<void>
}

export function useBoardState(): UseBoardStateReturn {
  const [cards, setCards] = useState<BoardCard[]>([])
  const [paths, setPaths] = useState<StoryPath[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectingFromCardId, setConnectingFromCardId] = useState<string | null>(null)
  const [rewiringArrow, setRewiringArrow] = useState<{ pathId: string; endpoint: 'from' | 'to' } | null>(null)

  const updateDebounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [boardData, pathsData] = await Promise.all([getBoard(), listPaths()])
        setCards(boardData.cards)
        setPaths(pathsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load board')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const cardId = event.active.id as string
      const card = cards.find(c => c.id === cardId)

      if (!card) return

      const newX = card.x + event.delta.x
      const newY = card.y + event.delta.y

      // Optimistic update
      setCards(prev =>
        prev.map(c =>
          c.id === cardId
            ? { ...c, x: newX, y: newY }
            : c
        )
      )

      try {
        await updateCardPosition(cardId, newX, newY)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update card position')
        // Revert on error
        setCards(prev => prev.map(c => (c.id === cardId ? card : c)))
      }
    },
    [cards]
  )

  const handleAddCard = useCallback(
    async (shape: CardShape) => {
      try {
        const lastCard = cards.length > 0 ? cards[cards.length - 1] : null
        const x = lastCard ? lastCard.x + 280 : 40
        const y = lastCard ? lastCard.y : 40

        const newCardData: Omit<BoardCard, 'id'> = {
          shape,
          x,
          y,
          title: '',
          color: COLOUR_PRESETS[0],
        }

        // Only rectangles have body text
        if (shape === 'rectangle') {
          newCardData.body = ''
        }

        const newCard = await addCard(newCardData)
        setCards(prev => [...prev, newCard])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add card')
      }
    },
    [cards]
  )

  const handleDeleteCard = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setCards(prev => prev.filter(c => c.id !== id))
      setPaths(prev => prev.filter(p => p.fromCardId !== id && p.toCardId !== id))

      await deleteCard(id)
      // Also delete connected paths on server
      const connectedPaths = paths.filter(p => p.fromCardId === id || p.toCardId === id)
      for (const path of connectedPaths) {
        await deletePath(path.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      // Reload on error
      const boardData = await getBoard()
      setCards(boardData.cards)
    }
  }, [paths])

  const handleUpdateCard = useCallback((id: string, patch: Partial<BoardCard>) => {
    // Optimistic update
    setCards(prev =>
      prev.map(c => (c.id === id ? { ...c, ...patch } : c))
    )

    // Clear any existing debounce for this card
    const existingTimeout = updateDebounceRef.current.get(id)
    if (existingTimeout) clearTimeout(existingTimeout)

    // Set a new debounce
    const timeout = setTimeout(async () => {
      try {
        await updateCard(id, patch)
        updateDebounceRef.current.delete(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update card')
        // Reload on error
        const boardData = await getBoard()
        setCards(boardData.cards)
      }
    }, 500)

    updateDebounceRef.current.set(id, timeout)
  }, [])

  const handleDeletePath = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setPaths(prev => prev.filter(p => p.id !== id))
      await deletePath(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete path')
      // Reload on error
      const pathsData = await listPaths()
      setPaths(pathsData)
    }
  }, [])

  const handleStartConnect = useCallback((fromCardId: string) => {
    setConnectingFromCardId(connectingFromCardId === fromCardId ? null : fromCardId)
  }, [connectingFromCardId])

  const handleConnectTo = useCallback(
    async (toCardId: string) => {
      if (!connectingFromCardId || connectingFromCardId === toCardId) return

      try {
        const newPath = await createPath(connectingFromCardId, toCardId)
        setPaths(prev => [...prev, newPath])
        setConnectingFromCardId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create connection')
      }
    },
    [connectingFromCardId]
  )

  const handleCancelConnect = useCallback(() => {
    setConnectingFromCardId(null)
  }, [])

  const handleStartRewiringArrow = useCallback((pathId: string, endpoint: 'from' | 'to') => {
    setRewiringArrow({ pathId, endpoint })
  }, [])

  const handleEndRewiringArrow = useCallback(
    async (toCardId: string | null) => {
      if (!rewiringArrow || !toCardId) {
        setRewiringArrow(null)
        return
      }

      const path = paths.find(p => p.id === rewiringArrow.pathId)
      if (!path) return

      try {
        // Delete old path and create new one with rewired endpoint
        await deletePath(path.id)

        const newFromCardId =
          rewiringArrow.endpoint === 'from' ? toCardId : path.fromCardId
        const newToCardId = rewiringArrow.endpoint === 'to' ? toCardId : path.toCardId

        const newPath = await createPath(newFromCardId, newToCardId, path.label)
        setPaths(prev => [
          ...prev.filter(p => p.id !== path.id),
          newPath,
        ])
        setRewiringArrow(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rewire connection')
        setRewiringArrow(null)
      }
    },
    [paths, rewiringArrow]
  )

  return {
    cards,
    paths,
    isLoading,
    error,
    connectingFromCardId,
    rewiringArrow,
    handleDragEnd,
    handleAddCard,
    handleDeleteCard,
    handleUpdateCard,
    handleDeletePath,
    handleStartConnect,
    handleConnectTo,
    handleCancelConnect,
    handleStartRewiringArrow,
    handleEndRewiringArrow,
  }
}
