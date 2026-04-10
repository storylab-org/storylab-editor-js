import { useState, useEffect, useRef, useCallback } from 'react'
import { OVERVIEW_ID } from '@/constants'
import {
  getDocument,
  updateDocument
} from '@/api/documents'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseChapterContentReturn {
  content: string
  setContent: (content: string) => void
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void
  saveStatus: SaveStatus
  isLoadingContent: boolean
  loadedChapterId: string | null
  handleSave: () => Promise<void>
}

/**
 * Manages chapter content loading, caching, dirty state, autosave, and save operations.
 * Handles content caching to avoid refetching chapters.
 * Implements 5-second autosave timer.
 */
export function useChapterContent(activeChapterId: string | null): UseChapterContentReturn {
  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [loadedChapterId, setLoadedChapterId] = useState<string | null>(null)

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentCacheRef = useRef<Map<string, string>>(new Map())
  const handleSaveRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Load document content when active chapter changes
  useEffect(() => {
    if (!activeChapterId) return

    // Skip document load for Overview
    if (activeChapterId === OVERVIEW_ID) {
      console.log('[LOAD] Loading Overview...')
      setLoadedChapterId(OVERVIEW_ID)
      setIsLoadingContent(false)
      return
    }

    // Check cache for previously loaded chapter content
    const cached = contentCacheRef.current.get(activeChapterId)
    if (cached !== undefined) {
      console.log(`[LOAD] ✓ Loading chapter "${activeChapterId}" from cache`)
      setContent(cached)
      setLoadedChapterId(activeChapterId)
      return
    }

    const loadDocument = async () => {
      setIsLoadingContent(true)
      try {
        console.log(`[LOAD] Loading chapter "${activeChapterId}"...`)
        const doc = await getDocument(activeChapterId)
        console.log(`[LOAD] ✓ Loaded chapter "${activeChapterId}" (name: "${doc.name}", ${doc.content.length} bytes)`)
        setContent(doc.content)
        setLoadedChapterId(activeChapterId)
        contentCacheRef.current.set(activeChapterId, doc.content)
      } catch (error) {
        console.error(`[LOAD] ✗ Failed to load chapter "${activeChapterId}":`, error)
        setContent('')
        setLoadedChapterId(activeChapterId)
      } finally {
        setIsLoadingContent(false)
      }
    }

    loadDocument()
  }, [activeChapterId])

  // Reset save status to idle after 3 seconds
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleSave = useCallback(async () => {
    if (!activeChapterId) return
    if (activeChapterId === OVERVIEW_ID) return

    setSaveStatus('saving')
    try {
      console.log(`[SAVE] Saving chapter "${activeChapterId}"`)
      console.log(`[SAVE] Content length: ${content.length} bytes`)
      console.log(`[SAVE] Content preview: ${content.substring(0, 100)}`)
      await updateDocument(activeChapterId, content)
      console.log(`[SAVE] ✓ Chapter "${activeChapterId}" saved successfully`)
      setSaveStatus('saved')
      setIsDirty(false)
      contentCacheRef.current.set(activeChapterId, content)
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error(`[SAVE] ✗ Failed to save chapter "${activeChapterId}":`, error)
      setSaveStatus('error')
    }
  }, [activeChapterId, content])

  // Keep ref in sync with latest handleSave (for autosave timer)
  useEffect(() => {
    handleSaveRef.current = handleSave
  }, [handleSave])

  // Autosave: trigger save after 5 seconds of inactivity if content is dirty
  useEffect(() => {
    if (!isDirty) return

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)

    autosaveTimerRef.current = setTimeout(() => {
      handleSaveRef.current()
    }, 5000)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [isDirty, content])

  return {
    content,
    setContent,
    isDirty,
    setIsDirty,
    saveStatus,
    isLoadingContent,
    loadedChapterId,
    handleSave,
  }
}
