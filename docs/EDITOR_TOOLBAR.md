# Editor Toolbar Guide

**Last Updated:** March 30, 2026
**Version:** Storylab v0.1.54

## Overview

The **FormattingToolbar** is a lightweight, stable toolbar component that provides essential text formatting and document structure controls for book writing. It is integrated directly into the Lexical editor and uses Lexical's command system to apply formatting.

---

## Current Toolbar Features

### 1. History Controls
- **Undo** (Ctrl+Z) — Revert the last change
- **Redo** (Ctrl+Y) — Redo the last undone change

### 2. Block Type Dropdown ⭐ (NEW)
The first major formatting control, positioned left of text formatting buttons.

**Available block types:**
- **Normal** — Standard paragraph text
- **Heading 1** — Major chapter/section title (largest)
- **Heading 2** — Subsection title
- **Heading 3** — Scene or smaller subsection (smallest)
- **Quote** — Block quote (indented, styled for dialogue or citations)
- **Code Block** — Pre-formatted code (monospace, preserves whitespace)

**How it works:**
1. Place cursor anywhere in a block, or select multiple blocks
2. Click the dropdown (shows current block type + icon)
3. Choose a new block type
4. All selected blocks convert to that type

**Active state indicator:** The dropdown shows which block type is currently active with a blue label.

### 3. Text Formatting
- **Bold** (Ctrl+B) — Make selected text bold. Active state shown in blue.
- **Italic** (Ctrl+I) — Make selected text italic. Active state shown in blue.
- **Underline** (Ctrl+U) — Underline selected text. Active state shown in blue.

### 4. List Controls
- **Bullet List** — Create an unordered (bulleted) list
- **Numbered List** — Create an ordered (numbered) list

Toggle on/off by clicking the button while in a list.

### 5. Text Alignment
- **Align Left** — Left-align text (default)
- **Align Centre** — Centre-align text
- **Align Right** — Right-align text

### 6. Image Insert ⭐ (NEW - v0.1.54)

**Insert images into the document:**
- Click the **Image** button (picture icon) to open file picker
- Or drag and drop PNG, JPEG, GIF, WebP images directly into the editor
- Images are stored content-addressed in the blockstore (SHA-256 CID)
- Maximum file size: **50MB** (configurable via `MAX_IMAGE_SIZE_MB` environment variable)

**How it works:**
1. Click the Image button → file picker opens
2. Select PNG/JPEG/GIF/WebP image file
3. File is uploaded to server, assigned a CID
4. Image appears inline in the document
5. Image is embedded in the saved document

**Drag and drop:**
1. Drag an image from your file manager
2. Drop it anywhere in the editor
3. Image uploads and inserts automatically
4. Multiple images can be dropped at once (queues one by one)

**Error handling:**
- **File too large** — Amber warning toast: "File is too large (X.XXMB). Maximum size: 50MB"
- **Upload failed** — Red error toast: "Upload failed: <error message>"
- **Unsupported format** — Silently skipped, no toast

**Technical details:**
- File: `src/components/editor/lexical/nodes/ImageNode.tsx` — DecoratorNode rendering `<img>` tags
- File: `src/components/editor/lexical/plugins/ImagePlugin.tsx` — handles file-drop and upload
- Server: `server/src/routes/images.ts` — POST /images (upload), GET /images/:cid (serve)
- Images are inline, participate in block reordering via dnd-kit (the wrapping paragraph is reordered)

### 7. Block Drag-and-Drop ⭐ (v0.1.53)

**Reorder document blocks by dragging:**
- Hover over any block in the editor to reveal a **grip handle** (≡) on the left
- Click and drag the handle to reorder blocks
- A **blue drop line** appears showing where the block will land
- Release to reorder blocks
- Works in both web browser and Tauri desktop app

**How it works:**
- Uses **dnd-kit** with Pointer Events (not HTML5 Drag API)
- Compatible with Tauri WebKit limitations (fixed in v0.1.53)
- Keyboard support: Use arrow keys with focused handle
- Toggle visibility in Chapter Settings → "Show drag menu button"

**Technical details:**
- File: `src/components/editor/lexical/plugins/DragDropBlockPlugin.tsx`
- Uses `useSortable` hook from dnd-kit for collision detection
- Integrates with Lexical's `insertBefore`/`insertAfter` for reordering
- Drop indicator line styled in `DragDropBlockPlugin.css`

---

## Sticky Toolbar ⭐ (NEW - v0.1.53)

The formatting toolbar now **sticks to the top** of the editor as you scroll:
- Toolbar stays visible for quick access to formatting controls
- Implemented via CSS `position: sticky; top: 0; z-index: 100;`
- Prevents need to scroll back up to access formatting buttons
- Improves UX for long documents

---

## How Formatting Works

### Block-Level Formatting (Headings, Quotes, Code)

Block formatting changes the **type** of the current block — not just styling applied to text.

```
User selects a paragraph and clicks "Heading 1" in the dropdown
    ↓
FormattingToolbar calls formatHeading('h1')
    ↓
Inside editor.update():
  - Get current selection
  - Call $setBlocksType() with $createHeadingNode('h1')
  - The entire block becomes a heading node
    ↓
Lexical re-renders the block as an <h1> element
```

**Why blocks matter for writing:**
- Chapters and sections are visually distinct
- Quotations (dialogues, citations) are clearly marked
- Document structure is preserved when exporting
- Table of Contents can auto-generate from headings

### Inline Formatting (Bold, Italic, Underline)

Inline formatting applies **text styles** to the selected text without changing the block type.

```
User selects "important" and clicks Bold
    ↓
handleFormat(FORMAT_TEXT_COMMAND, 'bold')
    ↓
Lexical marks the text with bold format
    ↓
Text renders with `font-weight: bold`
```

---

## Implementation Details

### File Structure
```
src/components/editor/
├── FormattingToolbar.tsx       ← Main toolbar component (sticky)
├── FormattingToolbar.css       ← Toolbar styles
├── EditorToolbar.tsx           ← Top toolbar (Save, Settings)
├── EditorToolbar.css           ← Top toolbar styles
└── NOTE: Export button moved to sidebar menu (see docs/SIDEBAR_MENU.md)
└── lexical/
    ├── plugins/
    │   ├── DragDropBlockPlugin.tsx  ← Block reordering with dnd-kit
    │   └── DragDropBlockPlugin.css  ← Drop indicator line styles
    ├── ui/
    │   ├── DropDown.tsx        ← Reusable dropdown component
    │   └── DropDown.tsx        ← Used by block type selector
    └── themes/
        ├── PlaygroundEditorTheme.ts   ← CSS class mappings
        └── PlaygroundEditorTheme.css  ← Text formatting styles
```

### Key Components

**FormattingToolbar.tsx:**
- Uses `useLexicalComposerContext()` to access the editor
- Maintains state for `isBold`, `isItalic`, `isUnderline`, `blockType`
- Registers an `updateListener` to detect changes and update button states
- Implements format functions: `formatParagraph()`, `formatHeading()`, `formatQuote()`, `formatCode()`

**DropDown.tsx:**
- Portal-based dropdown with keyboard navigation (Arrow Up/Down, Escape, Tab)
- Accepts `buttonIcon`, `buttonLabel`, `buttonClassName`, `disabled`, `stopCloseOnClickSelf`
- Used for the block type dropdown

### Block Type Detection

The toolbar tracks which block type the cursor is in via the `registerUpdateListener`:

```typescript
useEffect(() => {
  return editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        // Detect block type...
        const anchorNode = selection.anchor.getNode()
        const element = $findMatchingParent(...)

        if ($isListNode(element)) {
          setBlockType(element.getListType())  // 'bullet', 'number', 'check'
        } else if ($isHeadingNode(element)) {
          setBlockType(element.getTag())       // 'h1', 'h2', 'h3'
        } else {
          setBlockType(element.getType())      // 'paragraph', 'quote', 'code'
        }
      }
    })
  })
}, [editor])
```

---

## Adding New Formatting Features

To add more formatting to the toolbar, follow this pattern:

### Example: Adding Strikethrough

**1. Add a state variable:**
```typescript
const [isStrikethrough, setIsStrikethrough] = useState(false)
```

**2. Update the listener to track it:**
```typescript
useEffect(() => {
  return editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        setIsStrikethrough(selection.hasFormat('strikethrough'))
      }
    })
  })
}, [editor])
```

**3. Add a button:**
```tsx
<button
  title="Strikethrough (Ctrl+Shift+X)"
  onClick={() => handleFormat(FORMAT_TEXT_COMMAND, 'strikethrough')}
  className={`format-btn ${isStrikethrough ? 'active' : ''}`}
>
  <Strikethrough size={16} />
</button>
```

**4. Add CSS for active state** (if needed):
```css
.format-btn.active {
  background: #4a9eff;
  color: white;
  border-color: #2b7fcc;
}
```

---

## Testing the Toolbar

### Manual Testing

1. **Block conversion:**
   - Type or paste some text
   - Click the block dropdown → choose "Heading 1"
   - Verify text becomes a large heading
   - Click dropdown again → choose "Quote"
   - Verify text becomes a block quote (indented)

2. **Text formatting:**
   - Select a word
   - Click Bold
   - Verify the word is now bold, button is highlighted blue
   - Click Bold again to toggle off

3. **Active state tracking:**
   - Place cursor in a Heading 1 block
   - Verify the dropdown shows "Heading 1" as the label
   - Select text inside and hold — Bold/Italic buttons should update based on selection

4. **Undo/Redo:**
   - Make a change (e.g., make text bold)
   - Click Undo
   - Verify the change is reversed
   - Click Redo
   - Verify the change is re-applied

### Automated Testing

Run the test suite:
```bash
npm run test:frontend
```

Current test status: **29 tests passing** (as of v0.1.23)

---

## Tauri Drag-and-Drop Configuration ⭐ (NEW - v0.1.53)

**Why drag-and-drop in Tauri required special handling:**

Tauri's WebKit engine has a built-in file-drop handler (`dragDropEnabled: true` by default) that **intercepts OS drag events before they reach the WebView DOM**, preventing the HTML5 Drag API from working.

**Solution implemented:**
1. Set `dragDropEnabled: false` in `src-tauri/tauri.conf.json` window config to disable Tauri's interception
2. Switched block drag-and-drop from Lexical's experimental HTML5 plugin to **dnd-kit** with **Pointer Events**
3. Pointer Events operate at the browser level and are unaffected by OS-level event interception

**Configuration:**
```json
// src-tauri/tauri.conf.json
"app": {
  "windows": [{
    "title": "storylab",
    "width": 1100,
    "height": 800,
    "dragDropEnabled": false  // ← Disables Tauri's file-drop handler
  }]
}
```

---

## Known Limitations

1. **Alignment requires selection** — Alignment commands work best with selected text or blocks. Without selection, behaviour may vary.

2. **No font/size controls** — Advanced font selection and sizing are not yet in the toolbar (available in ToolbarPlugin, but causes stability issues).

3. **Limited dropdown styling** — The block type dropdown styling is minimal. Future versions could add icons, groups, or more visual separation.

4. **List toggle** — Clicking a list button when already in a list should toggle it off, but this depends on Lexical's LIST_COMMAND behaviour.

---

## Future Enhancements

Planned features (in order of priority for book writing):

1. **Strikethrough** — Simple text format, low risk
2. **Colour pickers** — Font colour and background colour
3. **Code language selector** — Auto-detect or manually choose syntax highlighting language for code blocks
4. **Clear formatting** — Remove all formatting from selected text
5. **Smarter undo/redo** — Disable buttons when nothing to undo/redo

---

## References

- **Lexical Docs:** https://lexical.dev
- **dnd-kit Docs:** https://docs.dndkit.com
- **FormattingToolbar source:** `src/components/editor/FormattingToolbar.tsx`
- **DragDropBlockPlugin source:** `src/components/editor/lexical/plugins/DragDropBlockPlugin.tsx`
- **DropDown component:** `src/components/editor/lexical/ui/DropDown.tsx`
- **Theme config:** `src/components/editor/lexical/themes/PlaygroundEditorTheme.ts`
- **Tauri config:** `src-tauri/tauri.conf.json`
