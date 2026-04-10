import { AlertTriangle } from 'lucide-react'
import GenericModal from '@/components/shared/GenericModal'

interface ImportConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isImporting: boolean
  format: string | null
}

/**
 * Import confirmation modal warning the user that all chapters will be replaced.
 * Displays the file format being imported.
 */
export default function ImportConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isImporting,
  format,
}: ImportConfirmModalProps) {
  return (
    <GenericModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Import ${format === 'epub' ? 'EPUB' : format?.toUpperCase() || 'File'}`}
      closeOnClickOutside={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <AlertTriangle size={20} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0f0f0f' }}>
              All current chapters will be replaced by the imported file.
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              This action cannot be undone. Continue?
            </p>
          </div>
        </div>
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
            onClick={onConfirm}
            disabled={isImporting}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: isImporting ? '#d1d5db' : '#ef4444',
              color: 'white',
              cursor: isImporting ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              opacity: isImporting ? 0.7 : 1,
            }}
          >
            {isImporting ? 'Importing...' : 'Replace & Import'}
          </button>
        </div>
      </div>
    </GenericModal>
  )
}
