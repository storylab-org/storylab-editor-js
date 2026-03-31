import { Check, AlertCircle, Save, Settings } from 'lucide-react';
import './EditorToolbar.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface EditorToolbarProps {
  chapterId?: string;
  chapterTitle?: string;
  onSave?: () => void;
  onSettings?: () => void;
  saveStatus?: SaveStatus;
}

export default function EditorToolbar({
  chapterId,
  chapterTitle = 'Untitled',
  onSave,
  onSettings,
  saveStatus = 'idle',
}: EditorToolbarProps) {

  return (
    <div className="editor-toolbar">
      <div className="toolbar-section toolbar-left">
        <div className="chapter-info">
          <div className="chapter-title-row">
            <h2 className="chapter-title">{chapterTitle}</h2>
            <button
              className="chapter-settings-button"
              onClick={onSettings}
              aria-label="Chapter settings"
              title="Chapter settings"
            >
              <Settings size={16} />
            </button>
          </div>
          {chapterId && <span className="chapter-id">Chapter {chapterId}</span>}
        </div>
      </div>

      <div className="toolbar-section toolbar-right">
        <button
          className="toolbar-button toolbar-button-primary"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          aria-label="Save chapter"
        >
          {saveStatus === 'saving' && <Save size={18} />}
          {saveStatus === 'saved' && <Check size={18} />}
          {saveStatus === 'error' && <AlertCircle size={18} />}
          {saveStatus === 'idle' && <Save size={18} />}

          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Save failed'}
          {saveStatus === 'idle' && 'Save'}
        </button>
      </div>
    </div>
  );
}
