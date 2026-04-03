import { useState, useCallback, useEffect, useRef } from 'react'
import { DragEndEvent } from '@dnd-kit/core'
import {
  getBoard,
  putBoard,
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
} from '@/api/draftboard'
import { createEntity, updateEntity, deleteEntity, type EntityType } from '@/api/entities'
import type { DocumentHead } from '@/api/documents'

const COLOUR_PRESETS = ['#ffd699', '#f0ccff', '#cce5ff', '#ccf0e6', '#ffcccc', '#e6ccff']

const ENTITY_COLOURS: Record<EntityType, string> = {
  character: '#d4edda',
  location: '#cce5ff',
  item: '#fff3cd',
}

interface EntityCreationData {
  name: string
  type: EntityType
  description: string
  tags: string[]
}

interface PendingEntity {
  id: string
  name: string
  type: EntityType
  color: string
}


interface UseBoardStateReturn {
  cards: BoardCard[]
  paths: StoryPath[]
  isLoading: boolean
  error: string | null
  connectingFromCardId: string | null
  rewiringArrow: { pathId: string; endpoint: 'from' | 'to' } | null
  previewShape: CardShape | null
  previewPosition: { x: number; y: number } | null
  connectionModeActive: boolean
  selectedCardId: string | null
  entityModal: { type: EntityType; editingEntityId?: string; initialData?: { name: string; description: string; tags: string[] } } | null
  pendingEntity: PendingEntity | null

  handleDragEnd: (event: DragEndEvent) => Promise<void>
  handleAddCard: (shape: CardShape) => void
  handleOpenEntityCreation: (type: EntityType) => void
  handleOpenEntityEdit: (entityId: string) => Promise<void>
  handleCloseEntityModal: () => void
  handleCreateEntityCard: (data: EntityCreationData) => Promise<void>
  handleSaveEntityEdit: (data: EntityCreationData) => Promise<void>
  handlePlaceCard: (x: number, y: number) => Promise<void>
  handleCancelAddCard: () => void
  handleDeleteCard: (id: string) => Promise<void>
  handleUpdateCard: (id: string, patch: Partial<BoardCard>) => void
  handleDeletePath: (id: string) => Promise<void>
  handleStartConnect: (fromCardId: string) => void
  handleConnectTo: (toCardId: string) => Promise<void>
  handleToggleConnectionMode: () => void
  handleCancelConnect: () => void
  handleStartRewiringArrow: (pathId: string, endpoint: 'from' | 'to') => void
  handleEndRewiringArrow: (toCardId: string | null) => Promise<void>
  handleResetBoard: () => Promise<void>
  handleSelectCard: (cardId: string | null) => void
  handleUnlinkEntity: (cardId: string) => void
}

export function useBoardState(chapters: DocumentHead[] = []): UseBoardStateReturn {
  const [cards, setCards] = useState<BoardCard[]>([])
  const [paths, setPaths] = useState<StoryPath[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectingFromCardId, setConnectingFromCardId] = useState<string | null>(null)
  const [rewiringArrow, setRewiringArrow] = useState<{ pathId: string; endpoint: 'from' | 'to' } | null>(null)
  const [previewShape, setPreviewShape] = useState<CardShape | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [connectionModeActive, setConnectionModeActive] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [entityModal, setEntityModal] = useState<{ type: EntityType; editingEntityId?: string; initialData?: { name: string; description: string; tags: string[] } } | null>(null)
  const [pendingEntity, setPendingEntity] = useState<PendingEntity | null>(null)

  const updateDebounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const cardsRef = useRef<BoardCard[]>([])
  const chaptersRef = useRef<DocumentHead[]>(chapters)

  // Keep chapters ref in sync
  useEffect(() => {
    chaptersRef.current = chapters
  }, [chapters])

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
      const activeId = event.active.id as string

      // Detect chapter-chip dropped onto a shape card → link chapter to shape
      if (activeId.startsWith('chapter:')) {
        const chapterId = activeId.replace('chapter:', '')
        const overId = event.over?.id as string | undefined

        if (!overId) return

        const targetCard = cards.find(c => c.id === overId && !c.entityId)
        if (!targetCard) return

        const chapter = chaptersRef.current.find(ch => ch.id === chapterId)
        if (!chapter) return

        const patch = { chapterId: chapter.id, chapterName: chapter.name }
        setCards(prev => prev.map(c => c.id === overId ? { ...c, ...patch } : c))

        try {
          await updateCard(overId, patch)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to link chapter')
          setCards(prev => prev.map(c => c.id === overId ? targetCard : c))
        }
        return
      }

      // Detect entity-card dropped onto a shape card → link entity to shape
      const card = cards.find(c => c.id === activeId)
      if (!card) return

      const overId = event.over?.id as string | undefined
      if (card.entityId && overId && overId !== activeId) {
        const targetCard = cards.find(c => c.id === overId && !c.entityId)
        if (targetCard) {
          const newEntity = {
            id: card.entityId,
            name: card.title || 'Unnamed',
            type: card.entityType!,
          }
          const linkedEntities = [...(targetCard.linkedEntities || []), newEntity]
          const patch = { linkedEntities }
          setCards(prev => prev.map(c => c.id === overId ? { ...c, ...patch } : c))
          try {
            await updateCard(overId, patch)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to link entity')
            setCards(prev => prev.map(c => c.id === overId ? targetCard : c))
          }
          return
        }
      }

      // Normal position update
      const CANVAS_WIDTH = 9999
      const CANVAS_HEIGHT = 6000
      const newX = Math.max(0, Math.min(CANVAS_WIDTH, card.x + event.delta.x))
      const newY = Math.max(0, Math.min(CANVAS_HEIGHT, card.y + event.delta.y))

      setCards(prev =>
        prev.map(c =>
          c.id === activeId
            ? { ...c, x: newX, y: newY }
            : c
        )
      )

      setSelectedCardId(activeId)

      try {
        await updateCardPosition(activeId, newX, newY)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update card position')
        setCards(prev => prev.map(c => (c.id === activeId ? card : c)))
      }
    },
    [cards]
  )

  const handleAddCard = useCallback((shape: CardShape) => {
    setPreviewShape(shape)
  }, [])

  const handleOpenEntityCreation = useCallback((type: EntityType) => {
    setEntityModal({ type })
  }, [])

  const handleOpenEntityEdit = useCallback(async (entityId: string) => {
    const { getEntity } = await import('@/api/entities')
    try {
      const entity = await getEntity(entityId)
      setEntityModal({
        type: entity.type,
        editingEntityId: entityId,
        initialData: {
          name: entity.name,
          description: entity.description || '',
          tags: entity.tags || [],
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity')
    }
  }, [])

  const handleCloseEntityModal = useCallback(() => {
    setEntityModal(null)
  }, [])

  const handleCreateEntityCard = useCallback(
    async (data: EntityCreationData) => {
      try {
        const entity = await createEntity(data.name, data.type, data.description, data.tags)
        const colour = ENTITY_COLOURS[data.type]
        setPendingEntity({ id: entity.id, name: entity.name, type: data.type, color: colour })
        setPreviewShape('rectangle')
        setEntityModal(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create entity')
      }
    },
    []
  )

  const handleSaveEntityEdit = useCallback(
    async (data: EntityCreationData) => {
      if (!entityModal?.editingEntityId) return
      try {
        await updateEntity(entityModal.editingEntityId, {
          name: data.name,
          description: data.description,
          tags: data.tags,
        })
        // Find and update the linked board card
        const card = cards.find(c => c.entityId === entityModal.editingEntityId)
        if (card) {
          handleUpdateCard(card.id, { title: data.name })
        }
        setEntityModal(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save entity')
      }
    },
    [entityModal, cards]
  )

  const handleCancelAddCard = useCallback(() => {
    setPreviewShape(null)
    setPreviewPosition(null)
  }, [])

  const handlePlaceCard = useCallback(
    async (x: number, y: number) => {
      if (!previewShape) return

      try {
        const newCardData: Omit<BoardCard, 'id'> = {
          shape: previewShape,
          x: Math.max(0, x - 100),
          y: Math.max(0, y - 80),
          title: pendingEntity ? pendingEntity.name : '',
          color: pendingEntity ? pendingEntity.color : COLOUR_PRESETS[0],
          ...(pendingEntity && {
            entityId: pendingEntity.id,
            entityType: pendingEntity.type,
          }),
        }
        const newCard = await addCard(newCardData)
        setCards(prev => [...prev, newCard])
        setPreviewShape(null)
        setPreviewPosition(null)
        setPendingEntity(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add card')
      }
    },
    [previewShape, pendingEntity]
  )

  const handleDeleteCard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id)
    try {
      // Optimistic update
      setCards(prev => prev.filter(c => c.id !== id))
      setPaths(prev => prev.filter(p => p.fromCardId !== id && p.toCardId !== id))

      await deleteCard(id)
      // Delete the backing entity if this was an entity card
      if (card?.entityId) {
        await deleteEntity(card.entityId)
      }
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
  }, [paths, cards])

  const handleUpdateCard = useCallback((id: string, patch: Partial<BoardCard>) => {
    // Optimistic update
    setCards(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, ...patch } : c))
      cardsRef.current = next
      return next
    })

    // Clear any existing debounce for this card
    const existingTimeout = updateDebounceRef.current.get(id)
    if (existingTimeout) clearTimeout(existingTimeout)

    // Set a new debounce
    const timeout = setTimeout(async () => {
      try {
        await updateCard(id, patch)
        // Sync entity name if this is an entity card and title changed
        const card = cardsRef.current.find(c => c.id === id)
        if (card?.entityId && 'title' in patch) {
          await updateEntity(card.entityId, { name: patch.title ?? '' })
        }
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

  const handleUnlinkEntity = useCallback((cardId: string, entityId?: string) => {
    if (entityId) {
      // Remove a specific linked entity from the array
      handleUpdateCard(cardId, {
        linkedEntities: (cards.find(c => c.id === cardId)?.linkedEntities || []).filter(e => e.id !== entityId),
      })
    } else {
      // Clear all linked entities (legacy compatibility)
      handleUpdateCard(cardId, { linkedEntities: [] })
    }
  }, [handleUpdateCard, cards])

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

  const handleToggleConnectionMode = useCallback(() => {
    setConnectionModeActive(prev => !prev)
    setConnectingFromCardId(null)
  }, [])

  const handleCancelConnect = useCallback(() => {
    setConnectingFromCardId(null)
  }, [])

  const handleResetBoard = useCallback(async () => {
    try {
      await putBoard({ cards: [], updatedAt: new Date().toISOString() })
      setCards([])
      setPaths([])
      setConnectionModeActive(false)
      setConnectingFromCardId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset board')
    }
  }, [])

  const handleSelectCard = useCallback((cardId: string | null) => {
    setSelectedCardId(cardId)
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
    previewShape,
    previewPosition,
    connectionModeActive,
    selectedCardId,
    entityModal,
    pendingEntity,
    handleDragEnd,
    handleAddCard,
    handleOpenEntityCreation,
    handleOpenEntityEdit,
    handleCloseEntityModal,
    handleCreateEntityCard,
    handleSaveEntityEdit,
    handlePlaceCard,
    handleCancelAddCard,
    handleDeleteCard,
    handleUpdateCard,
    handleDeletePath,
    handleStartConnect,
    handleConnectTo,
    handleToggleConnectionMode,
    handleCancelConnect,
    handleStartRewiringArrow,
    handleEndRewiringArrow,
    handleResetBoard,
    handleSelectCard,
    handleUnlinkEntity,
  }
}
