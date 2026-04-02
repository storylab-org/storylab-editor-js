import DraftBoardCanvas from './DraftBoardCanvas'
import type { DocumentHead } from '@/api/documents'

interface DraftBoardProps {
  chapters: DocumentHead[]
  onNavigateToChapter: (id: string) => void
}

export default function DraftBoard({ chapters, onNavigateToChapter }: DraftBoardProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DraftBoardCanvas chapters={chapters} onNavigateToChapter={onNavigateToChapter} />
    </div>
  )
}
