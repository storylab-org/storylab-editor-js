import { useState, memo } from 'react'
import { AlignJustify, X, Download, Upload, Key, ChevronDown } from 'lucide-react'
import ChapterList from '@/components/sidebar/ChapterList'
import type { DocumentHead } from '@/api/documents'

interface SidebarProps {
  activeChapterId: string
  onSelectChapter: (id: string) => void | Promise<void>
  chapters?: DocumentHead[]
  isLoading?: boolean
  onCreateChapter?: () => void
  onDeleteChapter?: (id: string) => void
  onReorder?: (chapters: DocumentHead[]) => void
  onExport?: (format: 'markdown' | 'html' | 'epub' | 'car' | 'pdf') => void
  onImport?: (format: 'epub' | 'car') => void | Promise<void>
}

interface FeaturesPanelProps {
  onExport?: (format: 'markdown' | 'html' | 'epub' | 'car' | 'pdf') => void
  onImport?: (format: 'epub' | 'car') => void | Promise<void>
}

function FeaturesPanel({ onExport, onImport }: FeaturesPanelProps) {
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null)
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('export')
  const [isImporting, setIsImporting] = useState(false)

  const exportFormats = [
    { format: 'markdown' as const, label: 'Markdown', enabled: true },
    { format: 'html' as const, label: 'HTML', enabled: true },
    { format: 'epub' as const, label: 'EPUB', enabled: true },
    { format: 'car' as const, label: 'CAR', enabled: true },
    { format: 'pdf' as const, label: 'PDF (coming soon)', enabled: false }
  ]

  const importFormats = [
    { format: 'epub' as const, label: 'EPUB' },
    { format: 'car' as const, label: 'CAR' }
  ]

  const otherFeatures = [
    { id: 'keygen', icon: Key, label: 'Key Generation' }
  ]

  const handleExportClick = (format: 'markdown' | 'html' | 'epub' | 'car' | 'pdf') => {
    if (format !== 'pdf') {
      onExport?.(format)
    }
  }

  const handleImportClick = async (format: 'epub' | 'car') => {
    setIsImporting(true)
    try {
      await onImport?.(format)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '0' }}>
      {/* Export Accordion */}
      <div style={{ borderBottom: '1px solid #e5e5e5' }}>
        <button
          onClick={() => setExpandedAccordion(expandedAccordion === 'export' ? null : 'export')}
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            border: 'none',
            background: '#f9f9f9',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            color: '#0f0f0f',
            fontWeight: '500',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0f0f0'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f9f9f9'
          }}
        >
          <Download size={16} style={{ color: '#999', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Export</span>
          <ChevronDown
            size={16}
            style={{
              transform: expandedAccordion === 'export' ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: '#999'
            }}
          />
        </button>

        {expandedAccordion === 'export' && (
          <div>
            {exportFormats.map((item) => (
              <button
                key={item.format}
                onClick={() => handleExportClick(item.format)}
                disabled={!item.enabled}
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  border: 'none',
                  background: hoveredIndex === item.format && item.enabled ? '#f0f0f0' : 'transparent',
                  cursor: item.enabled ? 'pointer' : 'not-allowed',
                  width: '100%',
                  textAlign: 'left',
                  color: item.enabled ? '#0f0f0f' : '#ccc',
                  transition: 'background-color 0.15s ease',
                  paddingLeft: '32px'
                }}
                onMouseEnter={() => item.enabled && setHoveredIndex(item.format)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Import Accordion */}
      <div style={{ borderBottom: '1px solid #e5e5e5' }}>
        <button
          onClick={() => setExpandedAccordion(expandedAccordion === 'import' ? null : 'import')}
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            border: 'none',
            background: '#f9f9f9',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            color: '#0f0f0f',
            fontWeight: '500',
            transition: 'background-color 0.15s ease',
            opacity: isImporting ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!isImporting) e.currentTarget.style.background = '#f0f0f0'
          }}
          onMouseLeave={(e) => {
            if (!isImporting) e.currentTarget.style.background = '#f9f9f9'
          }}
          disabled={isImporting}
        >
          <Upload size={16} style={{ color: '#999', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Import</span>
          {isImporting && <span style={{ fontSize: '12px', color: '#999' }}>Importing…</span>}
          {!isImporting && (
            <ChevronDown
              size={16}
              style={{
                transform: expandedAccordion === 'import' ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: '#999'
              }}
            />
          )}
        </button>

        {expandedAccordion === 'import' && !isImporting && (
          <div>
            {importFormats.map((item) => (
              <button
                key={item.format}
                onClick={() => handleImportClick(item.format)}
                disabled={isImporting}
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  border: 'none',
                  background: hoveredIndex === item.format ? '#f0f0f0' : 'transparent',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  color: '#0f0f0f',
                  transition: 'background-color 0.15s ease',
                  paddingLeft: '32px'
                }}
                onMouseEnter={() => !isImporting && setHoveredIndex(item.format)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Other Features */}
      {otherFeatures.map((feature) => {
        const IconComponent = feature.icon
        return (
          <button
            key={feature.id}
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              border: 'none',
              background: hoveredIndex === feature.id ? '#f5f5f5' : 'transparent',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              color: '#0f0f0f',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={() => setHoveredIndex(feature.id)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <IconComponent size={16} style={{ color: '#999', flexShrink: 0 }} />
            <span>{feature.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SidebarComponent({
  activeChapterId,
  onSelectChapter,
  chapters = [],
  isLoading = false,
  onCreateChapter = () => {},
  onDeleteChapter,
  onReorder,
  onExport,
  onImport
}: SidebarProps) {
  const [sidebarMode, setSidebarMode] = useState<'chapters' | 'features'>('chapters')

  return (
    <aside style={{ width: '200px', flexShrink: 0, borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e5' }}>
        <button
          onClick={() => setSidebarMode(sidebarMode === 'chapters' ? 'features' : 'chapters')}
          aria-label={sidebarMode === 'chapters' ? 'Open menu' : 'Back to chapters'}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            color: '#0f0f0f'
          }}
        >
          {sidebarMode === 'chapters' ? (
            <AlignJustify size={18} />
          ) : (
            <X size={18} />
          )}
        </button>
      </div>
      {sidebarMode === 'chapters' && (
        <ChapterList
          chapters={chapters}
          activeChapterId={activeChapterId}
          isLoading={isLoading}
          onSelectChapter={onSelectChapter}
          onCreateChapter={onCreateChapter}
          onDeleteChapter={onDeleteChapter}
          onReorder={onReorder}
        />
      )}
      {sidebarMode === 'features' && <FeaturesPanel onExport={onExport} onImport={onImport} />}
    </aside>
  )
}

export default memo(SidebarComponent)
