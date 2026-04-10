import GenericModal from '@/components/shared/GenericModal'

interface ExportFilenameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (filename: string) => Promise<void>
  filename: string
  onFilenameChange: (filename: string) => void
  format: string | null
}

/**
 * Export filename modal for web-only export (Tauri uses native file picker).
 * Allows the user to enter a custom filename before download.
 */
export default function ExportFilenameModal({
  isOpen,
  onClose,
  onConfirm,
  filename,
  onFilenameChange,
  format,
}: ExportFilenameModalProps) {
  const formatDisplay =
    format === 'markdown'
      ? 'Markdown'
      : format === 'html'
        ? 'HTML'
        : format === 'epub'
          ? 'EPUB'
          : 'CID'

  return (
    <GenericModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export ${formatDisplay}`}
      closeOnClickOutside={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#0f0f0f' }}>
            Filename
          </label>
          <input
            type="text"
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          />
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
          File will be downloaded to your browser's default downloads folder.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e5e5',
              background: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(filename)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: '#0f0f0f',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            Download
          </button>
        </div>
      </div>
    </GenericModal>
  )
}
