import GenericModal from '@/components/shared/GenericModal'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Help modal displaying keyboard shortcuts, export formats, import info, and about.
 * Part of the EditorLayout layout.
 */
export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <GenericModal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts & Help"
      closeOnClickOutside={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
        {/* Keyboard Shortcuts */}
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
            Keyboard Shortcuts
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              {/* Writing */}
              <tr>
                <td colSpan={2} style={{ padding: '6px 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Writing</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>Cmd+b</td>
                <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Bold</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>Cmd+i</td>
                <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Italic</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>Cmd+u</td>
                <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Underline</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>Cmd+z</td>
                <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Undo</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0 6px 0', color: '#666' }}>Cmd+Shift+z</td>
                <td style={{ padding: '4px 0 6px 8px', color: '#0f0f0f' }}>Redo</td>
              </tr>

              {/* Navigation */}
              <tr>
                <td colSpan={2} style={{ padding: '6px 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Navigation & Commands</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>Cmd+f</td>
                <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Find & Replace</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0 6px 0', color: '#666' }}>Cmd+t</td>
                <td style={{ padding: '4px 0 6px 8px', color: '#0f0f0f' }}>Toggle Typewriter Mode</td>
              </tr>

              {/* File */}
              <tr>
                <td colSpan={2} style={{ padding: '6px 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>File</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>Cmd+s</td>
                <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Save chapter</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Export Formats */}
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
            Export Formats
          </h3>
          <ul style={{ margin: '0', paddingLeft: '16px', fontSize: '12px' }}>
            <li style={{ color: '#0f0f0f', marginBottom: '4px' }}>
              <strong>Markdown</strong> — Plain text with formatting, ideal for version control
            </li>
            <li style={{ color: '#0f0f0f', marginBottom: '4px' }}>
              <strong>HTML</strong> — Web-ready formatted document
            </li>
            <li style={{ color: '#0f0f0f', marginBottom: '4px' }}>
              <strong>EPUB</strong> — E-book format for digital readers
            </li>
            <li style={{ color: '#0f0f0f' }}>
              <strong>CAR</strong> — Content-addressed archive for backup & sharing
            </li>
          </ul>
        </div>

        {/* Import */}
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
            Import
          </h3>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            Import EPUB or CAR files to replace all chapters. This action cannot be undone.
          </p>
        </div>

        {/* About */}
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
            About
          </h3>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            Storylab v0.2.9 — A powerful writing and story planning application for authors
          </p>
        </div>
      </div>
    </GenericModal>
  )
}
