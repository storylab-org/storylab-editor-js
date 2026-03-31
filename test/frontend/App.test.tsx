import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'

describe('App — Book Editor Landing Page', () => {
  it('should render the sidebar menu button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('should render 3 chapters in the sidebar', () => {
    render(<App />)
    expect(screen.getByText('Chapter 1 — The Beginning')).toBeInTheDocument()
    expect(screen.getByText('Chapter 2 — Rising Action')).toBeInTheDocument()
    expect(screen.getByText('Chapter 3 — The Turning Point')).toBeInTheDocument()
  })

  it('should mark active chapter with highlight style', () => {
    render(<App />)
    const chapter1Button = screen.getByRole('button', { name: 'Chapter 1 — The Beginning' })
    expect(chapter1Button).toHaveStyle('background: #0f0f0f')
  })

  it('should change active chapter when clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    const chapter2Button = screen.getByRole('button', { name: 'Chapter 2 — Rising Action' })

    await user.click(chapter2Button)

    expect(chapter2Button).toHaveStyle('background: #0f0f0f')
  })

  it('should render the editor textarea', () => {
    render(<App />)
    const textarea = screen.getByPlaceholderText('Begin writing your story here...')
    expect(textarea).toBeInTheDocument()
  })

  it('should render toolbar buttons with accessible names', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Strikethrough' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heading 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heading 2' })).toBeInTheDocument()
  })

  it('should start with 0 word count', () => {
    render(<App />)
    expect(screen.getByText('0 words')).toBeInTheDocument()
  })

  it('should update word count when typing', async () => {
    const user = userEvent.setup()
    render(<App />)
    const textarea = screen.getByPlaceholderText('Begin writing your story here...')

    await user.type(textarea, 'Hello world')

    expect(screen.getByText('2 words')).toBeInTheDocument()
  })

  it('should display New Chapter button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /\+ New Chapter/ })).toBeInTheDocument()
  })
})
