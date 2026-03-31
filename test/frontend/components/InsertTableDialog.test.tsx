import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import InsertTableDialog from '@/components/editor/InsertTableDialog'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'

const mockOnClose = vi.fn()

const defaultConfig = {
  namespace: 'test-editor',
  nodes: [TableNode, TableCellNode, TableRowNode],
  onError: () => {},
  theme: {},
}

describe('InsertTableDialog', () => {
  beforeEach(() => {
    mockOnClose.mockClear()
  })

  const renderDialog = () => {
    return render(
      <LexicalComposer initialConfig={defaultConfig}>
        <InsertTableDialog onClose={mockOnClose} />
      </LexicalComposer>
    )
  }

  it('should render the dialog with default values', () => {
    renderDialog()

    expect(screen.getByText('Insert Table')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows:')).toHaveValue(3)
    expect(screen.getByLabelText('Columns:')).toHaveValue(3)
  })

  it('should have Insert and Cancel buttons', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Insert' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('should allow changing row count', async () => {
    const user = userEvent.setup()
    renderDialog()

    const rowsInput = screen.getByLabelText('Rows:') as HTMLInputElement
    fireEvent.change(rowsInput, { target: { value: '5' } })

    expect(parseInt(rowsInput.value)).toBe(5)
  })

  it('should allow changing column count', async () => {
    const user = userEvent.setup()
    renderDialog()

    const colsInput = screen.getByLabelText('Columns:') as HTMLInputElement
    fireEvent.change(colsInput, { target: { value: '4' } })

    expect(parseInt(colsInput.value)).toBe(4)
  })

  it('should enforce minimum row value of 1', async () => {
    const user = userEvent.setup()
    renderDialog()

    const rowsInput = screen.getByLabelText('Rows:') as HTMLInputElement
    await user.clear(rowsInput)
    await user.type(rowsInput, '0')
    fireEvent.blur(rowsInput)

    expect(parseInt(rowsInput.value)).toBeGreaterThanOrEqual(1)
  })

  it('should enforce maximum row value of 20', async () => {
    const user = userEvent.setup()
    renderDialog()

    const rowsInput = screen.getByLabelText('Rows:') as HTMLInputElement
    await user.clear(rowsInput)
    await user.type(rowsInput, '25')
    fireEvent.blur(rowsInput)

    expect(parseInt(rowsInput.value)).toBeLessThanOrEqual(20)
  })

  it('should enforce maximum column value of 10', async () => {
    const user = userEvent.setup()
    renderDialog()

    const colsInput = screen.getByLabelText('Columns:') as HTMLInputElement
    await user.clear(colsInput)
    await user.type(colsInput, '15')
    fireEvent.blur(colsInput)

    expect(parseInt(colsInput.value)).toBeLessThanOrEqual(10)
  })

  it('should close dialog when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderDialog()

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should close dialog when overlay is clicked', async () => {
    const user = userEvent.setup()
    renderDialog()

    const overlay = document.querySelector('.insert-table-dialog-overlay')
    if (overlay) {
      await user.click(overlay)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('should close dialog when Escape is pressed', async () => {
    const user = userEvent.setup()
    renderDialog()

    const rowsInput = screen.getByLabelText('Rows:')
    await user.click(rowsInput)
    fireEvent.keyDown(rowsInput, { key: 'Escape' })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should close dialog when Enter is pressed', async () => {
    const user = userEvent.setup()
    renderDialog()

    const rowsInput = screen.getByLabelText('Rows:')
    await user.click(rowsInput)
    fireEvent.keyDown(rowsInput, { key: 'Enter' })

    expect(mockOnClose).toHaveBeenCalled()
  })
})
