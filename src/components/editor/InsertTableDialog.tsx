import { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import './InsertTableDialog.css'

interface InsertTableDialogProps {
  onClose: () => void
}

export default function InsertTableDialog({ onClose }: InsertTableDialogProps) {
  const [editor] = useLexicalComposerContext()
  const [rows, setRows] = useState(3)
  const [columns, setColumns] = useState(3)

  const handleInsert = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: String(rows),
      columns: String(columns),
      includeHeaders: true,
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInsert()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="insert-table-dialog-overlay" onClick={onClose}>
      <div className="insert-table-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Insert Table</h3>
        <div className="dialog-content">
          <div className="input-group">
            <label htmlFor="rows">Rows:</label>
            <input
              id="rows"
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="input-group">
            <label htmlFor="columns">Columns:</label>
            <input
              id="columns"
              type="number"
              min="1"
              max="10"
              value={columns}
              onChange={(e) => setColumns(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <div className="dialog-actions">
          <button onClick={handleInsert} className="btn-primary">
            Insert
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
