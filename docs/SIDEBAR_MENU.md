# Sidebar Menu Guide

**Last Updated:** March 31, 2026
**Version:** Storylab v0.1.81

## Overview

The **Sidebar Menu** provides access to project-level features including exports, imports, and key management. It is accessed via a hamburger menu button (☰) in the top-left of the sidebar, replacing the static "📖 My Novel" heading.

---

## Menu Modes

### Chapters View (Default)

Shows the list of book chapters with:
- Chapter names
- Active chapter highlight
- Drag-to-reorder capability (dnd-kit)
- "+ New Chapter" button
- Hamburger menu button (☰) in header

### Features View

Accessed by clicking the hamburger menu button (☰). Shows:
- **Export accordion** — Markdown, HTML, EPUB, PDF (coming soon)
- **Import button** — Placeholder for future import functionality
- **Key Generation button** — Placeholder for future key management
- **Cancel button** (✕) to return to chapters view

---

## Export Feature

### Overview

**Export** allows you to download your book in multiple formats. The export functionality is **platform-aware**:

- **Web browser:** Browser download dialog
- **Tauri desktop app:** Native file save dialog

### Supported Formats

| Format | Status | File Extension |
|--------|--------|---|
| **Markdown** | ✅ Active | .md |
| **HTML** | ✅ Active | .html |
| **EPUB** | ✅ Active | .epub |
| **PDF** | ⏳ Coming soon | .pdf |

### How to Export

**1. Open the features menu:**
   - Click the hamburger menu button (☰) in the top-left of the sidebar
   - Sidebar switches from chapters list to features panel

**2. Expand the Export accordion:**
   - Click on "Export" to reveal available formats
   - Accordion expands to show Markdown, HTML, EPUB options

**3. Choose export format:**
   - Click **Markdown**, **HTML**, or **EPUB**
   - (PDF is disabled — coming soon)

**4. Save the file:**

   **On web browser:**
   - Browser download dialog appears
   - Choose download location (default: Downloads folder)
   - File downloads automatically

   **On Tauri desktop:**
   - Native file save dialog appears
   - Choose folder and filename
   - Confirm save
   - File is written to disk immediately

**5. Return to chapters:**
   - Click the cancel button (✕) to return to the chapters list

### Technical Implementation

**Files involved:**
- `src/api/export.ts` — Export client with platform detection
- `src/components/sidebar/Sidebar.tsx` — Menu toggle and FeaturesPanel
- `src-tauri/src/lib.rs` — Rust backend for file writing
- `src/components/layout/EditorLayout.tsx` — Export handler

**Platform Detection:**

The app detects the environment by attempting to invoke a Tauri command:

```typescript
async function isRunningInTauri(): Promise<boolean> {
  try {
    await invoke('get_server_status')
    return true
  } catch {
    return false
  }
}
```

If successful → Tauri desktop app. If error → web browser.

**Export Flow:**

```
User clicks export format
    ↓
exportAndSave(format, filename)
    ↓
Fetch from /api/export/{format} (backend generates file)
    ↓
isRunningInTauri() check
    ↓
    ├─ YES (Tauri):
    │   - Show native save dialog via dialog.save()
    │   - User chooses path and filename
    │   - Pass blob + full path to Rust command
    │   - save_export_file() writes to disk
    │
    └─ NO (Web):
        - Create blob URL
        - Trigger browser download
        - Revoke blob URL
```

### Permissions (Tauri)

The Tauri app requires the following permissions in `src-tauri/capabilities/default.json`:

```json
"permissions": [
  "core:default",
  "dialog:allow-save",
  "dialog:default",
  "opener:default"
]
```

- `dialog:allow-save` — Allows native save file dialog
- `dialog:default` — Default dialog functionality

### Error Handling

**Export errors are logged to the browser console:**

```
[EXPORT] ✗ Failed to export epub: <error message>
```

**Common issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| File not saved | No location selected in dialog | Click cancel and try again |
| Permission denied | Missing Tauri permissions | Update capabilities/default.json |
| Export failed | Backend API error | Check server is running |

---

## Mocked Features

The following features are currently mocked (non-functional placeholders):

### Import
- Shows "Import" button with upload icon
- Clicking does nothing (awaiting implementation)
- Intended for: Load books from external files

### Key Generation
- Shows "Key Generation" button with key icon
- Clicking does nothing (awaiting implementation)
- Intended for: Generate encryption/authentication keys

---

## UI Components

### Sidebar.tsx

Main sidebar component that manages menu state:

```typescript
const [sidebarMode, setSidebarMode] = useState<'chapters' | 'features'>('chapters')
```

Conditionally renders:
- `<ChapterList>` — When in "chapters" mode
- `<FeaturesPanel>` — When in "features" mode

**Props:**
```typescript
interface SidebarProps {
  activeChapterId: string
  onSelectChapter: (id: string) => void
  chapters?: DocumentHead[]
  isLoading?: boolean
  onCreateChapter?: () => void
  onDeleteChapter?: (id: string) => void
  onReorder?: (chapters: DocumentHead[]) => void
  onExport?: (format: 'markdown' | 'html' | 'epub' | 'pdf') => void
}
```

### FeaturesPanel

Local component inside `Sidebar.tsx` that renders the features menu:

- **Export accordion** with expandable list of formats
- **Other features** (Import, Key Generation) with hover effects
- Hover state tracking for visual feedback
- ChevronDown icon for accordion toggle

**Styling:**
- Background colors: `#f9f9f9` (header), `#f0f0f0` (hover)
- Icon colors: `#999` (subdued)
- Smooth transitions: `transition: 'background-color 0.15s ease'`

---

## Future Enhancements

Planned features:

1. **Import functionality** — Load books from Markdown, HTML, EPUB
2. **Key generation** — Create encryption keys for document security
3. **PDF export** — Full PDF export with formatting
4. **Export settings** — Options for cover page, TOC, metadata
5. **Recent exports** — Quick access to previously exported formats

---

## Testing

### Manual Testing

1. **Open features menu:**
   - Click hamburger button (☰)
   - Verify sidebar switches to features view
   - Verify cancel button (✕) is visible

2. **Export accordion:**
   - Click "Export" to expand
   - Verify Markdown, HTML, EPUB appear
   - Verify PDF is disabled (greyed out)
   - Click "Export" again to collapse

3. **Export a file (Web):**
   - Click Markdown
   - Verify browser download dialog appears
   - Verify file is named `book.markdown`

4. **Export a file (Tauri):**
   - Click EPUB
   - Verify native file save dialog appears
   - Choose location and filename
   - Verify file is saved to chosen location

5. **Return to chapters:**
   - Click cancel button (✕)
   - Verify sidebar returns to chapters list
   - Verify selected chapter is highlighted

### Automated Testing

Run the test suite:

```bash
npm run test:frontend
```

Export API tests verify:
- `exportBook()` fetches correct format from backend
- `exportAndSave()` returns without error
- `triggerDownload()` creates and revokes blob URL

---

## References

- **Tauri Dialog Plugin:** https://v2.tauri.app/docs/features/dialogs/save
- **Sidebar source:** `src/components/sidebar/Sidebar.tsx`
- **Export source:** `src/api/export.ts`
- **Tauri backend:** `src-tauri/src/lib.rs`
- **Tauri permissions:** `src-tauri/capabilities/default.json`
