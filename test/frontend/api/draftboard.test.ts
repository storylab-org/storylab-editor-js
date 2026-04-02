import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getOverview,
  putOverview,
  listPaths,
  createPath,
  deletePath,
  type OverviewData,
  type StoryPath
} from '../../../src/api/draftboard'

describe('draftboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOverview', () => {
    it('should fetch overview from GET /overview', async () => {
      const mockOverview: OverviewData = {
        content: 'World notes',
        updatedAt: '2026-03-20T00:00:00Z'
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOverview
      } as Response)

      const result = await getOverview()

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/overview')
      expect(result).toEqual(mockOverview)
    })

    it('should throw on non-2xx status', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

      await expect(getOverview()).rejects.toThrow()
    })
  })

  describe('putOverview', () => {
    it('should save overview via PUT /overview', async () => {
      const content = 'Updated world notes'
      const mockResponse: OverviewData = {
        content,
        updatedAt: '2026-03-20T12:00:00Z'
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response)

      const result = await putOverview(content)

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/overview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('listPaths', () => {
    it('should fetch paths from GET /paths', async () => {
      const mockPaths: StoryPath[] = [
        {
          id: 'path1',
          fromCardId: 'ch1',
          toCardId: 'ch2',
          label: 'If left',
          createdAt: '2026-03-20T00:00:00Z'
        }
      ]

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaths
      } as Response)

      const result = await listPaths()

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/paths')
      expect(result).toEqual(mockPaths)
    })

    it('should return empty array on empty response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      } as Response)

      const result = await listPaths()

      expect(result).toEqual([])
    })
  })

  describe('createPath', () => {
    it('should create path via POST /paths with label', async () => {
      const mockPath: StoryPath = {
        id: 'path1',
        fromCardId: 'ch1',
        toCardId: 'ch2',
        label: 'If players choose forest',
        createdAt: '2026-03-20T00:00:00Z'
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockPath
      } as Response)

      const result = await createPath('ch1', 'ch2', 'If players choose forest')

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCardId: 'ch1',
          toCardId: 'ch2',
          label: 'If players choose forest'
        })
      })
      expect(result).toEqual(mockPath)
    })

    it('should create path without label', async () => {
      const mockPath: StoryPath = {
        id: 'path1',
        fromCardId: 'ch1',
        toCardId: 'ch2',
        createdAt: '2026-03-20T00:00:00Z'
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockPath
      } as Response)

      const result = await createPath('ch1', 'ch2')

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCardId: 'ch1',
          toCardId: 'ch2',
          label: undefined
        })
      })
      expect(result).toEqual(mockPath)
    })

    it('should throw on creation error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400
      } as Response)

      await expect(createPath('ch1', 'ch2')).rejects.toThrow()
    })
  })

  describe('deletePath', () => {
    it('should delete path via DELETE /paths/:id', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 204
      } as Response)

      await deletePath('path1')

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/paths/path1', {
        method: 'DELETE'
      })
    })

    it('should throw on 404', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response)

      await expect(deletePath('unknown')).rejects.toThrow()
    })
  })
})
