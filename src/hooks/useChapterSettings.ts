import { useState, useCallback } from 'react'

export interface ChapterSettings {
  pageBackground: string
  showDragMenu?: boolean
  enableTreeViewPlugin?: boolean
}

interface UseChapterSettingsReturn {
  chapterSettings: Record<string, ChapterSettings>
  updateSettings: (chapterId: string, key: string, value: unknown) => void
  getChapterSettings: (chapterId: string) => ChapterSettings
}

/**
 * Manages per-chapter settings (background colour, drag menu, tree view).
 * Persists to localStorage with the key pattern: `chapter-settings-{chapterId}`
 */
export function useChapterSettings(): UseChapterSettingsReturn {
  const [chapterSettings, setChapterSettings] = useState<Record<string, ChapterSettings>>({})

  const getChapterSettings = useCallback((chapterId: string): ChapterSettings => {
    return chapterSettings[chapterId] ?? { pageBackground: '#f9f9f9' }
  }, [chapterSettings])

  const updateSettings = useCallback((chapterId: string, key: string, value: unknown) => {
    if (!chapterId) return

    const updated = { ...getChapterSettings(chapterId), [key]: value }
    setChapterSettings(prev => ({ ...prev, [chapterId]: updated }))
    localStorage.setItem(`chapter-settings-${chapterId}`, JSON.stringify(updated))
    console.log(`[SETTINGS] Updated chapter "${chapterId}" ${key} to ${value}`)
  }, [getChapterSettings])

  return {
    chapterSettings,
    updateSettings,
    getChapterSettings,
  }
}
