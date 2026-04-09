import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportBook, triggerDownload } from '../../../src/api/export'

describe('export API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportBook', () => {
    it('fetches markdown export', async () => {
      const mockBlob = new Blob(['# Test'], { type: 'text/markdown' })
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Map([['X-Manifest-CID', 'bafkrei123']]),
      })

      const result = await exportBook('markdown')

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/export/markdown', {
        method: 'GET',
      })
      expect(result.blob).toBe(mockBlob)
      expect(result.manifestCid).toBe('bafkrei123')
    })

    it('fetches html export', async () => {
      const mockBlob = new Blob(['<html></html>'], { type: 'text/html' })
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Map([['X-Manifest-CID', 'bafkrei456']]),
      })

      const result = await exportBook('html')

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/export/html', {
        method: 'GET',
      })
      expect(result.blob).toBe(mockBlob)
      expect(result.manifestCid).toBe('bafkrei456')
    })

    it('fetches epub export', async () => {
      const mockBlob = new Blob(['PK...'], { type: 'application/epub+zip' })
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Map(),
      })

      const result = await exportBook('epub')

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/export/epub', {
        method: 'GET',
      })
      expect(result.blob).toBe(mockBlob)
      expect(result.manifestCid).toBeUndefined()
    })

    it('throws on non-OK response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(exportBook('markdown')).rejects.toThrow(
        'Export failed with status 500: Internal Server Error'
      )
    })

    it('throws on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'))

      await expect(exportBook('html')).rejects.toThrow('Network failed')
    })

    // Note: Skipping the custom API base test as import.meta.env
    // is read at module load time and cannot be modified during tests
  })

  describe('triggerDownload', () => {
    it('creates and clicks anchor element', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockUrl = 'blob:mock-url'
      const originalCreateObjectURL = URL.createObjectURL
      const originalRevokeObjectURL = URL.revokeObjectURL

      URL.createObjectURL = vi.fn().mockReturnValue(mockUrl)
      URL.revokeObjectURL = vi.fn()

      // Mock document.createElement and appendChild/removeChild
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      }

      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

      triggerDownload(blob, 'test.txt')

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
      expect(mockAnchor.href).toBe(mockUrl)
      expect(mockAnchor.download).toBe('test.txt')
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)

      // Restore
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
      vi.restoreAllMocks()
    })

    it('handles different file types', () => {
      const testCases = ['book.md', 'book.html', 'book.epub', 'story.pdf']

      testCases.forEach((filename) => {
        const blob = new Blob(['test'], { type: 'application/octet-stream' })

        URL.createObjectURL = vi.fn().mockReturnValue('blob:url')
        URL.revokeObjectURL = vi.fn()

        const mockAnchor = {
          href: '',
          download: '',
          click: vi.fn(),
        }

        vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

        triggerDownload(blob, filename)

        expect(mockAnchor.download).toBe(filename)

        vi.restoreAllMocks()
      })
    })
  })
})
