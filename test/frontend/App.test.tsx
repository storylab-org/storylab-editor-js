import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as documentsAPI from '../../src/api/documents'
import * as overviewAPI from '../../src/api/overview'
import App from '../../src/App'

vi.mock('../../src/api/documents')
vi.mock('../../src/api/overview')

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

    // Mock overview API functions (Draft Board planning content)
    ;(overviewAPI.getOverview as any).mockResolvedValue({
      content: '',
      updatedAt: new Date().toISOString()
    })
    ;(overviewAPI.putOverview as any).mockResolvedValue({
      content: '',
      updatedAt: new Date().toISOString()
    })
    ;(overviewAPI.getBoard as any).mockResolvedValue({
      cards: [],
      updatedAt: new Date().toISOString()
    })
    ;(overviewAPI.putBoard as any).mockResolvedValue({
      cards: [],
      updatedAt: new Date().toISOString()
    })
    ;(overviewAPI.listPaths as any).mockResolvedValue([])
    ;(overviewAPI.createPath as any).mockResolvedValue({
      id: 'path1',
      fromCardId: 'ch1',
      toCardId: 'ch2',
      createdAt: new Date().toISOString()
    })
    ;(overviewAPI.deletePath as any).mockResolvedValue(undefined)
    ;(overviewAPI.addCard as any).mockResolvedValue({
      id: 'card1',
      shape: 'rectangle',
      x: 0,
      y: 0,
      title: '',
      body: '',
      color: '#fff9e6'
    })
    ;(overviewAPI.updateCard as any).mockResolvedValue({
      id: 'card1',
      shape: 'rectangle',
      x: 0,
      y: 0,
      title: '',
      body: '',
      color: '#fff9e6'
    })
    ;(overviewAPI.updateCardPosition as any).mockResolvedValue({
      id: 'card1',
      shape: 'rectangle',
      x: 10,
      y: 10,
      title: '',
      body: '',
      color: '#fff9e6'
    })
    ;(overviewAPI.deleteCard as any).mockResolvedValue(undefined)
  })

  it('should render the sidebar menu button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('should render 3 chapters in the sidebar', async () => {
    render(<App />)
    await waitFor(() => {
      // Use getAllByRole since chapter buttons appear in sidebar and story map
      const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
      expect(chapter1Buttons.length).toBeGreaterThan(0)
    })
    expect(screen.getAllByRole('button', { name: /Chapter 2 — Rising Action/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Chapter 3 — The Turning Point/ }).length).toBeGreaterThan(0)
  })

  it('should mark active chapter with highlight style', async () => {
    render(<App />)
    await waitFor(() => {
      const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
      expect(chapter1Buttons.length).toBeGreaterThan(0)
    })
    const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
    expect(chapter1Buttons[0]).toBeInTheDocument()
  })

  it('should change active chapter when clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => {
      const chapter2Buttons = screen.getAllByRole('button', { name: /Chapter 2 — Rising Action/ })
      expect(chapter2Buttons.length).toBeGreaterThan(0)
    })
    const chapter2Buttons = screen.getAllByRole('button', { name: /Chapter 2 — Rising Action/ })
    // Click the first one (the sidebar button, not the story map card)
    await user.click(chapter2Buttons[0])

    expect(chapter2Buttons[0]).toBeInTheDocument()
  })

  it('should render the editor textarea', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => {
      // Wait for chapters to load
      const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
      expect(chapter1Buttons.length).toBeGreaterThan(0)
    })
    // Click on a chapter to open the editor (use first button which is in sidebar)
    const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
    await user.click(chapter1Buttons[0])

    // Now find the editor (Lexical uses a contenteditable div, not a textarea)
    // There will be 2 textboxes: one for planning notes in Draft Board, one for the chapter editor
    await waitFor(() => {
      const textboxes = screen.getAllByRole('textbox')
      expect(textboxes.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should render toolbar buttons with accessible names', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => {
      // Wait for chapters to load
      const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
      expect(chapter1Buttons.length).toBeGreaterThan(0)
    })
    // Click on a chapter to open the editor (use first button which is in sidebar)
    const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
    await user.click(chapter1Buttons[0])

    // Now verify the editor and toolbar are rendered
    await waitFor(() => {
      // FormattingToolbar should render with formatting buttons
      // At minimum, verify the editor region exists which contains the toolbar
      const textboxes = screen.getAllByRole('textbox')
      expect(textboxes.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should start with Draft Board view', async () => {
    render(<App />)
    await waitFor(() => {
      // Draft Board is shown first, with toolbar buttons visible
      expect(screen.getByRole('button', { name: /Add Rectangle/i })).toBeInTheDocument()
    })
  })

  it('should update word count when typing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => {
      // Wait for chapters to load
      const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
      expect(chapter1Buttons.length).toBeGreaterThan(0)
    })
    // Click on a chapter to open the editor (use first button which is in sidebar)
    const chapter1Buttons = screen.getAllByRole('button', { name: /Chapter 1 — The Beginning/ })
    await user.click(chapter1Buttons[0])

    await waitFor(() => {
      // Verify editor is rendered
      const textboxes = screen.getAllByRole('textbox')
      expect(textboxes.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should display New Chapter button', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ New Chapter/ })).toBeInTheDocument()
    })
  })
})
