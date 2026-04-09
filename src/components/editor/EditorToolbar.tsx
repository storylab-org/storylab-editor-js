import { Check, AlertCircle, Save, Settings, ListOrdered, HelpCircle } from 'lucide-react';
import './EditorToolbar.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface EditorToolbarProps {
  chapterId?: string;
  chapterTitle?: string;
  onSave?: () => void;
  onSettings?: () => void;
  onApplyOrder?: () => void;
  canApplyOrder?: boolean;
  saveStatus?: SaveStatus;
  onHelp?: () => void;
}

export default function EditorToolbar({
  chapterId,
  chapterTitle = 'Untitled',
  onSave,
  onSettings,
  onApplyOrder,
  canApplyOrder = false,
  saveStatus = 'idle',
  onHelp,
}: EditorToolbarProps) {
  const isOverview = !chapterId

  return (
    <div className="editor-toolbar">
      <div className="toolbar-section toolbar-left">
        <div className="chapter-info">
          <div className="chapter-title-row">
            <h2 className="chapter-title">{chapterTitle}</h2>
            {onSettings && (
              <button
                className="chapter-settings-button"
                onClick={onSettings}
                aria-label="Chapter settings"
                title="Chapter settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
          {chapterId && <span className="chapter-id">Chapter {chapterId}</span>}
        </div>
      </div>

      <div className="toolbar-section toolbar-right">
        {onHelp && (
          <button
            className="chapter-settings-button"
            onClick={onHelp}
            aria-label="Help"
            title="Help"
          >
            <HelpCircle size={16} />
          </button>
        )}
        {isOverview && onApplyOrder ? (
          <button
            className="toolbar-button toolbar-button-primary"
            onClick={onApplyOrder}
            disabled={!canApplyOrder}
            aria-label="Apply chapter order"
            title="Apply chapter order from card path"
          >
            <ListOrdered size={18} />
            Apply Order
          </button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
