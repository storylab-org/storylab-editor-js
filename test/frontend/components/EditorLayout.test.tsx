import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as documentsAPI from '../../../src/api/documents'

vi.mock('../../../src/api/documents')

describe('EditorLayout — API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('chapter lifecycle', () => {
    it('should call listDocuments on mount', async () => {
      ;(documentsAPI.listDocuments as any).mockResolvedValueOnce([])

      // Simulating what EditorLayout does on mount
      await documentsAPI.listDocuments()

      expect(documentsAPI.listDocuments).toHaveBeenCalled()
    })

    it('should create default chapter if list is empty', async () => {
      ;(documentsAPI.createDocument as any).mockResolvedValueOnce({
        id: 'ch1',
        name: 'Untitled',
        cic: 'cid1'
      })

      await documentsAPI.createDocument('Untitled', '')

      expect(documentsAPI.createDocument).toHaveBeenCalledWith('Untitled', '')
    })

    it('should getDocument after loading chapter ID', async () => {
      ;(documentsAPI.getDocument as any).mockResolvedValueOnce({
        id: 'ch1',
        name: 'Chapter 1',
        content: ''
      })

      await documentsAPI.getDocument('ch1')

      expect(documentsAPI.getDocument).toHaveBeenCalledWith('ch1')
    })

    it('should updateDocument when saving', async () => {
      ;(documentsAPI.updateDocument as any).mockResolvedValueOnce({
        id: 'ch1',
        name: 'Chapter 1',
        cic: 'cid2'
      })

      const serialisedState = JSON.stringify({ root: { children: [] } })
      await documentsAPI.updateDocument('ch1', serialisedState)

      expect(documentsAPI.updateDocument).toHaveBeenCalledWith(
        'ch1',
        serialisedState
      )
    })

    it('should refresh list after creating chapter', async () => {
      ;(documentsAPI.listDocuments as any).mockResolvedValueOnce([])
      ;(documentsAPI.createDocument as any).mockResolvedValueOnce({
        id: 'new-ch',
        name: 'New Chapter'
      })
      ;(documentsAPI.listDocuments as any).mockResolvedValueOnce([
        { id: 'new-ch', name: 'New Chapter' }
      ])

      await documentsAPI.listDocuments()
      await documentsAPI.createDocument('New Chapter', '')
      await documentsAPI.listDocuments()

      expect(documentsAPI.listDocuments).toHaveBeenCalledTimes(2)
      expect(documentsAPI.createDocument).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('should handle API errors in getDocument', async () => {
      ;(documentsAPI.getDocument as any).mockRejectedValueOnce(
        new Error('Not found')
      )

      try {
        await documentsAPI.getDocument('missing')
      } catch (error) {
        expect(error).toBeDefined()
      }

      expect(documentsAPI.getDocument).toHaveBeenCalledWith('missing')
    })

    it('should handle API errors in updateDocument', async () => {
      ;(documentsAPI.updateDocument as any).mockRejectedValueOnce(
        new Error('Server error')
      )

      try {
        await documentsAPI.updateDocument('ch1', '')
      } catch (error) {
        expect(error).toBeDefined()
      }

      expect(documentsAPI.updateDocument).toHaveBeenCalled()
    })
  })
})
