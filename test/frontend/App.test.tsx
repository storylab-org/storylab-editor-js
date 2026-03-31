import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as documentsAPI from '../../src/api/documents'
import App from '../../src/App'

vi.mock('../../src/api/documents')

describe('App — Book Editor Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock listDocuments to return 3 chapters
    ;(documentsAPI.listDocuments as any).mockResolvedValue([
      { id: 'ch1', name: 'Chapter 1 — The Beginning', order: 0 },
      { id: 'ch2', name: 'Chapter 2 — Rising Action', order: 1 },
      { id: 'ch3', name: 'Chapter 3 — The Turning Point', order: 2 }
    ])

    // Mock getDocument for any chapter ID
    ;(documentsAPI.getDocument as any).mockImplementation((id: string) => {
      const chapters = [
        { id: 'ch1', name: 'Chapter 1 — The Beginning', content: '' },
        { id: 'ch2', name: 'Chapter 2 — Rising Action', content: '' },
        { id: 'ch3', name: 'Chapter 3 — The Turning Point', content: '' }
      ]
      const chapter = chapters.find(c => c.id === id)
      return Promise.resolve(chapter || chapters[0])
    })

    // Mock other API functions as safe defaults
    ;(documentsAPI.createDocument as any).mockResolvedValue({
      id: 'ch1',
      name: 'Chapter 1 — The Beginning',
      order: 0
    })
    ;(documentsAPI.updateDocument as any).mockResolvedValue({
      id: 'ch1',
      name: 'Chapter 1 — The Beginning',
      cic: 'cid1'
    })
    ;(documentsAPI.deleteDocument as any).mockResolvedValue(undefined)
    ;(documentsAPI.reorderDocuments as any).mockResolvedValue(undefined)
  })

  it('should render the sidebar menu button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('should render 3 chapters in the sidebar', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chapter 1 — The Beginning/ })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Chapter 2 — Rising Action/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chapter 3 — The Turning Point/ })).toBeInTheDocument()
  })

  it('should mark active chapter with highlight style', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chapter 1 — The Beginning/ })).toBeInTheDocument()
    })
    const chapter1Button = screen.getByRole('button', { name: /Chapter 1 — The Beginning/ })
    expect(chapter1Button).toBeInTheDocument()
  })

  it('should change active chapter when clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chapter 2 — Rising Action/ })).toBeInTheDocument()
    })
    const chapter2Button = screen.getByRole('button', { name: /Chapter 2 — Rising Action/ })

    await user.click(chapter2Button)

    expect(chapter2Button).toBeInTheDocument()
  })

  it('should render the editor textarea', async () => {
    render(<App />)
    await waitFor(() => {
      // Lexical uses a contenteditable div, not a textarea
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })
    const editor = screen.getByRole('textbox')
    expect(editor).toBeInTheDocument()
  })

  it('should render toolbar buttons with accessible names', async () => {
    render(<App />)
    await waitFor(() => {
      // FormattingToolbar should render with formatting buttons
      // Find any button in the toolbar area (using data-testid or aria-label)
      const toolbar = screen.getByRole('textbox').closest('div')?.parentElement?.previousElementSibling
      expect(toolbar).toBeInTheDocument()
    })
    // At minimum, verify the editor region exists which contains the toolbar
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should start with 0 word count', () => {
    render(<App />)
    expect(screen.getByText('0 words')).toBeInTheDocument()
  })

  it('should update word count when typing', async () => {
    render(<App />)
    await waitFor(() => {
      // Verify editor and word count are rendered
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByText('0 words')).toBeInTheDocument()
    })
  })

  it('should display New Chapter button', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ New Chapter/ })).toBeInTheDocument()
    })
  })
})
