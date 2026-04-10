# Lexical Plugin Stack — DM Storybook Editor
### Two editor instances, one coherent writing tool

> **Last Updated:** April 2026 — Aligned with Tauri v2 + Fastify backend architecture

---

## Current Status (April 2026)

### ✅ Completed — Phase 1 ✨
- **Lexical v0.41.0 editor** fully integrated with React 19
- **Toolbar** — block type dropdown, bold, italic, underline, lists, alignment, code blocks
- **Plugins** — rich text, history, list, link, table, code
- **Icons** — Lucide React (20+ toolbar icons)
- **Image resizing** — proportional resize with SE corner handle + width persistence
- **Sidebar menu** — hamburger toggle with export accordion
- **Auto-save** — dirty editor state persists when switching chapters
- **File storage** — content-addressed blockstore + REST API (35+ tests)
- **Platform support** — Tauri desktop app + Fastify backend
- **Word count** — Real-time word count in status bar (via `registerTextContentListener`)
- **SlashCommandPlugin** ⭐ — `/h1`, `/h2`, `/h3`, `/quote`, `/code`, `/table`, `/hr`, `/image`, `/character`, `/location`, `/item`
  - Cursor-anchored command palette with filtered search
  - Full keyboard navigation (↑↓ arrows, Enter, Escape)
  - Real Lucide React icons (Heading1, Quote, Code, Table2, Minus, Image, User, MapPin, Package)
  - Professional styling with consistent padding and spacing
  - Image file picker with size validation (max 5MB)
  - Viewport-aware positioning (clamps to screen bounds)
  - Fade-in animation
- **Entity Mentions** ⭐ — `@character`, `#location`, `!item` with three insertion methods
  - **Trigger characters** — Type `@`, `#`, or `!` to open entity autocomplete palette
  - **Slash commands** — Type `/character`, `/location`, `/item` in the slash palette
  - **Toolbar dropdown** — "Mention" button with icon and keyboard shortcut hints
  - Colour-coded mentions (purple, teal, amber) with matching Lucide icons
  - **Clickable popovers** — Click any mention to view entity details
  - Popover **sticks to mention** when scrolling (not fixed)
  - Full entity details: name, type badge, description
  - Server-backed entity lookup via REST API

### ⏳ Next Phase (Recommended Priority Order)
1. **Draft board entity cards** — Entity nodes on the board, create/edit from draft board
2. **Scene breaks** — SceneBreakNode for visual chapter structure
3. **Floating toolbar** — Selection-triggered formatting + margin comments
4. **Find/Replace** — Ctrl+F search and replace across document
5. **Export pipeline** — Complete CID export, polish other formats

**Note on ChapterNode:** Skipped for now. Sidebar already manages chapter selection cleanly. ChapterNode would mostly duplicate that. Revisit later if we need inline chapter metadata or outline mode.

---

## Architecture overview

The editor eventually runs **two Lexical instances** mounted side by side (or toggled as views):

| Instance | Purpose | Primary mode |
|---|---|---|
| **Novel Editor** | Chapter-structured prose, the actual book | Focused writing |
| **Draft Board** | Clipboard, rough outline, visual storyline | Planning & linking |

The two share a common data store via the **Fastify backend** so that chapter cards on the Draft Board reflect the actual chapter state in the Novel Editor — word count, status, title.

---

## Integration with Tauri + Fastify

The editor system runs within:
- **Frontend** — React + Lexical in Tauri webview (port 1420 dev)
- **Backend** — Fastify server for persistence, entity data, export processing (port 3000)
- **Desktop** — Tauri handles app lifecycle, file dialogs, native features

**Key flows:**
- Editor changes → Auto-save to Fastify `/documents/:id`
- Entity queries (`@npc`) → Fetch from Fastify `/entities?type=npc`
- Export → Fastify processes Lexical JSON → Returns formatted file
- Chapter sync → Both editors pull from Fastify for consistency

---

## Official @lexical packages

These are drop-in — install, register nodes, mount the plugin inside `<LexicalComposer>`.

### `@lexical/rich-text` → `RichTextPlugin`
The foundation of both instances. Handles keyboard, clipboard, copy/paste, undo gestures. Both the Novel Editor and the Draft Board need this.

```bash
npm install @lexical/rich-text
```

### `@lexical/history` → `HistoryPlugin`
Undo/redo stack. Essential. Mount in both editors. The Draft Board gets its own independent history so reordering cards doesn't pollute the novel's history.

```bash
npm install @lexical/history
```

### `@lexical/markdown` → `MarkdownShortcutPlugin`
Converts markdown-flavoured shortcuts to rich formatting as the writer types. `## Chapter title` → Heading 2, `---` → divider, `**bold**` → bold. DMs who are comfortable with markdown will love this. Pair with `TRANSFORMERS` from the package for fine-grained control over which shortcuts are active.

```bash
npm install @lexical/markdown
```

### `@lexical/list` → `ListPlugin` + `CheckListPlugin`
Needed for any list content inside chapters: item inventories, NPC trait lists, chapter notes. CheckListPlugin specifically enables interactive checkboxes — useful for "revision checklist" sections.

```bash
npm install @lexical/list
```

### `@lexical/link` → `LinkPlugin` + `AutoLinkPlugin`
`LinkPlugin` enables proper hyperlink nodes. `AutoLinkPlugin` auto-detects URLs or configured patterns as the user types. Important for the entity mention system (entity names auto-link to their profile pages).

```bash
npm install @lexical/link
```

### `@lexical/table` → `TablePlugin`
Optional for the Novel Editor but valuable for NPC reference tables embedded in chapters, or a recap table at the start of a chapter. Required if you want to embed structured data directly in prose.

```bash
npm install @lexical/table
```

### `@lexical/react` → `OnChangePlugin`, `EditorRefPlugin`, `ClearEditorPlugin`
`OnChangePlugin` is the backbone of AutoSave and WordCount — every editor state change fires the callback. `EditorRefPlugin` lets external UI (sidebar, toolbar) access the editor instance without prop-drilling. These come bundled in the `@lexical/react` package.

```bash
npm install @lexical/react
```

---

## Custom nodes

Custom nodes are classes that extend Lexical's base node types. They define how content is stored (JSON), how it renders in the DOM, and how it serialises on export.

### `SceneBreakNode` (extends `DecoratorNode`) — Next Priority ⭐
An ornamental separator between scenes within a chapter. Renders as `* * *` (or a custom SVG motif). Inserted via slash command (`/scene-break`). Serialises to `---` on Markdown export, `<hr>` on HTML export.

**Why now?** Immediate editorial value. DMs need scene breaks in almost every chapter. No sidebar redundancy.

See **[docs/SCENE_BREAK_NODE.md](SCENE_BREAK_NODE.md)** for full implementation guide.

### `ChapterNode` (extends `ElementNode`) — Deferred
The root block for each chapter. Would store: `title`, `chapterId`, `status` (draft/revision/final), `synopsis`. Would render a styled header bar with chapter number, title, and status badge.

**Status:** Deferred. Sidebar already manages chapter selection cleanly. ChapterNode would mostly duplicate that functionality. Revisit later if we need inline chapter metadata visibility or outline mode.

Example skeleton for reference:
```typescript
class ChapterNode extends ElementNode {
  __title: string;
  __chapterId: string;
  __status: 'draft' | 'revision' | 'final';

  static getType() { return 'chapter'; }
  static clone(node: ChapterNode) { return new ChapterNode(node.__title, node.__chapterId, node.__status, node.__key); }
  createDOM() { /* render chapter header div */ }
  exportJSON() { return { ...super.exportJSON(), title: this.__title, chapterId: this.__chapterId, status: this.__status }; }
}
```

### `EntityMentionNode` (extends `TextNode`)
When the writer types `@Elara` or `#Thornwood`, the EntityMentionPlugin transforms the matched text into an `EntityMentionNode`. This node:
- Renders with a subtle underline and accent colour (different per entity type: purple for NPCs, teal for locations, amber for items)
- Stores the entity type and entity ID
- On click, opens the entity side panel without leaving the editor
- On export, converts to plain text with an optional footnote link

### `MarkerNode` (extends `TextNode`)
A coloured highlight over a text range, attached to a category:
- `draft-note` (yellow) — something the writer flagged for themselves
- `needs-revision` (orange) — marked for a second pass
- `dm-aside` (blue) — a DM-facing note that should be stripped on export

Inline, non-intrusive. Multiple markers can overlap (stacked categories).

### `DraftCardNode` — Draft Board only (extends `DecoratorNode`)
Each card on the Draft Board is a `DraftCardNode`. It renders a draggable card component containing:
- Chapter title (synced from `chapterId`)
- Synopsis / rough notes field (editable inline)
- Word count badge
- Status chip
- A "jump to chapter" link that focuses the Novel Editor at that chapter

Because it's a `DecoratorNode`, the card can render arbitrary React — including drag handles, status dropdowns, etc.

### `StickyNoteNode` — Draft Board only (extends `DecoratorNode`)
A free-floating note card not linked to any chapter — pure clipboard material. A DM can paste a session quote, a stray idea, or an NPC description here. These sit outside the chapter order and can be dragged freely. On the Draft Board they render with a slightly different background (a warm cream or parchment colour).

### `ChapterLinkNode` (extends `DecoratorNode`)
A visual connector between cards on the Draft Board. Stores `fromChapterId` and `toChapterId` plus an optional `label` (e.g. "leads to", "contradicts", "foreshadows"). Renders as an SVG line or arrow between the two cards.

---

## Custom plugins — Novel Editor

These are React components mounted inside the `<LexicalComposer>` of the Novel Editor. They register commands, transforms, and listeners.

### `EntityMentionPlugin` ★ Essential
The most impactful plugin for this use case. Watches text transforms for trigger characters:
- `@` → NPC lookup
- `#` → Location lookup
- `!` → Item lookup

On match, opens a floating autocomplete dropdown populated from the entity store. On selection, replaces the text with an `EntityMentionNode`. Requires a debounced query against your entity data — this can be local (Zustand/Context) or remote (API).

**Implementation pattern:** Uses `useLexicalComposerContext`, registers a `TextNode` transform that checks the most recently typed characters. When the trigger + partial name pattern matches, renders a floating portal with the autocomplete list.

```typescript
// Core loop
editor.registerNodeTransform(TextNode, (node) => {
  const text = node.getTextContent();
  const match = text.match(/@([\w\s]*)$/);
  if (match) showEntityDropdown(match[1], node);
});
```

### `FloatingToolbarPlugin` ★ Essential
Appears only when text is selected — never visible otherwise. Contains only the most relevant actions for prose:
- Bold / Italic / Underline
- Add marker (dropdown: draft-note / needs-revision / dm-aside)
- Add margin comment
- Create entity mention from selection
- Look up selected word in entity index

Built with `createPortal` anchored to the selection's bounding rect. The key detail: it should disappear the moment selection collapses, with no hover state keeping it pinned.

### `MarginCommentPlugin` ★ Essential
Similar to Google Docs comments. Selected text gets a `MarkerNode` applied; a comment card appears in the right gutter alongside that line. Comments are stored outside the Lexical document (in your app state) and rendered by a React sidebar component that scrolls in sync with the editor via a `$getNodeByKey` position calculation.

The plugin listens to `SELECTION_CHANGE_COMMAND` to highlight the active comment's anchored text.

### `SlashCommandPlugin` ★ Essential
Typing `/` at the start of a paragraph opens a command palette. Commands relevant to this editor:

| Command | Action |
|---|---|
| `/chapter` | Insert a new `ChapterNode` |
| `/scene-break` | Insert a `SceneBreakNode` |
| `/npc` | Insert an NPC reference card (table node) |
| `/hr` | Insert a horizontal rule |
| `/quote` | Insert a blockquote (in-world document, letter, etc.) |

Register via `KEY_DOWN_COMMAND`, intercept `/` at line start, render a floating command palette portal.

### `WordCountPlugin` ★ Essential
Uses `OnChangePlugin`-style listener to compute word count on every editor state update. Reports:
- Total word count for the full document
- Per-chapter word count (by traversing `ChapterNode` children)
- Estimated reading time

Displayed in a status bar below the editor. Fast enough for documents up to ~200k words without debouncing.

### `AutoSavePlugin` ★ Essential
Wraps `OnChangePlugin`. Debounces saves by 1500ms (adjustable). On each save:
1. Serialises the editor state to JSON via `editorState.toJSON()`
2. Writes to your persistence layer (localStorage for now, remote DB later)
3. Stamps a `lastSaved` timestamp visible in the status bar

Adds a `SAVE_COMMAND` (Ctrl/Cmd+S) that bypasses the debounce for a forced immediate save.

### `HighlightPlugin` (category markers)
Manages the `MarkerNode` lifecycle. Registers commands for applying and removing markers. Provides a `TOGGLE_MARKER_COMMAND` that the FloatingToolbar dispatches. Also renders a sidebar panel listing all markers by category, with "jump to" links.

### `CollapsiblePlugin`
Allows a `ChapterNode` to be collapsed to just its header bar — hiding its content from view without removing it from the document. Important for long documents where you want to focus on one chapter. Uses `DecoratorNode`-style rendering with a toggle button on the chapter header. The collapsed state is editor-view-only and does not affect the serialised JSON.

---

## Custom plugins — Draft Board

### `ClipboardScratchPlugin` ★ Essential
The core clipboard behaviour. Listens for:
1. **Paste from Novel Editor** — when the user selects text in the Novel Editor and copies it, pasting into the Draft Board creates a new `StickyNoteNode` pre-populated with that text fragment.
2. **Quick capture field** — a dedicated input at the top of the Draft Board that creates a new sticky note on Enter.
3. **Drag from browser** — drop highlighted text onto the board to create a note.

Uses `PASTE_COMMAND` and a custom `CREATE_STICKY_NOTE_COMMAND`.

### `ChapterSyncPlugin` ★ Essential
Keeps `DraftCardNode` instances in sync with their corresponding `ChapterNode` in the Novel Editor. Subscribes to the Novel Editor's `OnChangePlugin` output, extracts chapter metadata (title, word count, status), and dispatches `UPDATE_DRAFT_CARD_COMMAND` to the Draft Board's editor.

This is the bridge between the two Lexical instances. Implemented with a shared Zustand store: the Novel Editor writes chapter state on change; the Draft Board reads and renders from that store.

### `CardDragDropPlugin` ★ Essential
Enables drag-to-reorder of `DraftCardNode` items on the board. Two layout modes:
- **Linear (outline mode)** — cards stack vertically in chapter order. Dragging reorders chapters.
- **Free canvas mode** — cards can be positioned anywhere on a 2D canvas. Good for non-linear brainstorming.

In linear mode, reordering cards emits a `REORDER_CHAPTERS_COMMAND` that updates the chapter order in the Novel Editor too (soft suggestion — the DM confirms before it takes effect in the novel).

### `StorylineMapPlugin`
Renders visual connectors between `DraftCardNode` items using `ChapterLinkNode` data. Draws SVG arrows on a canvas layer beneath the cards. The user adds a link by Shift-clicking two cards, then labels the relationship type (leads to / contradicts / parallel arc / foreshadows).

On hover, highlights the linked pair. On export, can render a "story flow" diagram to include as a front-matter page in the book.

---

## Nice-to-have plugins

### `FocusWritingPlugin` (typewriter mode)
Keeps the active paragraph vertically centred on screen as the user types. Dims all paragraphs except the active one to 25% opacity. Triggered via a toolbar toggle. No structural changes to the document — purely a CSS/scroll side-effect plugin.

### `FindReplacePlugin`
`Ctrl/Cmd+F` opens a floating find-and-replace panel. Uses Lexical's `$findMatchingParent` and text node iteration to locate and highlight matches, then replaces them via `REPLACE_TEXT_COMMAND`. Critical for consistency editing (renaming an NPC across the whole manuscript).

### `ReadingTimePlugin`
Extends `WordCountPlugin`. Outputs estimated reading time at 230 wpm (average adult silent reading speed) for each chapter and the full document. Displayed in the chapter header.

### `ExportPlugin`
Serialises the Lexical document to external formats on demand:
- **Markdown** — via `$convertToMarkdownString` from `@lexical/markdown`
- **HTML** — via `$generateHtmlFromNodes` from `@lexical/html`
- **DOCX** — pipe the HTML output into `html-docx-js` or `pandoc` for Word-compatible output
- **EPUB** — structure chapters as EPUB spine items; use `epub-gen` or a similar library

Strip `MarkerNode` (dm-aside type) and `MarginCommentPlugin` annotations before export.

### `AutoCompletePlugin`
Extends the entity mention system with an ambient autocomplete — as the writer types any word over 3 characters, it checks the entity name index and gently suggests completions (greyed-out ghost text to the right of the cursor, accepted with Tab). Helps the DM stay consistent with character names across a long manuscript.

---

## Recommended implementation order

**Phase 1 — Core Writing Experience** ✅ (Complete)
- ✅ `RichTextPlugin` + `HistoryPlugin` — get writing working
- ✅ `OnChangePlugin` + `AutoSavePlugin` — persistence baseline
- ✅ `WordCountPlugin` — word count in status bar (via `registerTextContentListener`)
- ✅ `SlashCommandPlugin` — command palette with 8 commands: `/h1`, `/h2`, `/h3`, `/quote`, `/code`, `/table`, `/hr`, `/image`
  - Location: `src/components/editor/lexical/plugins/SlashCommandPlugin/`
  - Features: keyboard navigation, viewport clamping, image file picker, Lucide icons
  - File: `src/components/editor/LexicalEditor.tsx:36` (import) + line 155 (register)

**Phase 2 — Document Structure** (Ready to Start)
- ⏳ `ChapterNode` + `CollapsiblePlugin` — chapter headers + fold/unfold
- ⏳ `SceneBreakNode` — visual separators between scenes (custom decorator)
- ⏳ Chapter management API in Fastify (`POST /chapters`, `PATCH /chapters/:id`)

**Phase 3 — Entity System** (Highest Impact)
- ⏳ `EntityMentionPlugin` + `EntityMentionNode` — `@character`, `#location`, `!item` autocomplete
- ⏳ `EntityMentionNode` styling — colour-coded underlines per entity type
- ⏳ Entity API in Fastify (`GET /entities`, `POST /entities`, `PATCH /entities/:id`)

**Phase 4 — Annotation & Collaboration** (Medium Priority)
- ⏳ `FloatingToolbarPlugin` — selection-triggered toolbar (bold, italic, markers)
- ⏳ `HighlightPlugin` + `MarkerNode` — draft-note, needs-revision, dm-aside markers
- ⏳ `MarginCommentPlugin` — margin comments synced to Fastify

**Phase 5 — Draft Board & Visual Planning** (Lower Priority for Now)
- ⏳ Draft Board editor instance (separate Lexical composer)
- ⏳ `DraftCardNode` + `ChapterSyncPlugin` — cards pull chapter data from backend
- ⏳ `CardDragDropPlugin` + reorder chapters endpoint
- ⏳ `StorylineMapPlugin` — visual story flow diagram

**Phase 6 — Export & Distribution** (Final)
- ⏳ `ExportPlugin` — Markdown, HTML, DOCX, EPUB via Fastify
- ⏳ `FindReplacePlugin` — Ctrl/Cmd+F find & replace across document
- ⏳ Polish: typewriter mode, reading time, autocompletion suggestions

---

## Key architectural decision: shared state between editors

The two Lexical instances cannot share an editor state directly — each instance is independent. The recommended pattern is a **shared store** outside of Lexical:

```
Novel Editor (Lexical)
    → onChange → extract chapter metadata
    → write to Zustand store

Draft Board (Lexical)
    → reads Zustand store to render DraftCardNodes
    → dispatches REORDER or STATUS changes back to Zustand
    → Novel Editor subscribes to those changes
```

This keeps both editors lean and avoids the complexity of a multi-editor Yjs document while still enabling real-time sync within the same browser session.

---

## Immediate Action Points (High-Impact, Low-Effort)

### 1. Word Count + Reading Time Status Bar ⏱️ [~2h]
- Add `WordCountPlugin` that listens to editor changes
- Extract word count per chapter (traverse `ChapterNode` children once available)
- Display total + per-chapter in status bar below editor
- Estimated reading time at 230 wpm (standard adult reading speed)
- **Why first:** Adds immediate value, zero design decisions needed, straightforward Lexical pattern

### 2. Slash Command Plugin ⌨️ [~4h]
- Intercept `/` at line start → render floating command palette portal
- Commands: `/chapter` (new ChapterNode), `/scene-break` (SceneBreakNode), `/quote` (blockquote), `/hr` (divider)
- Register `KEY_DOWN_COMMAND` listener, position portal relative to cursor
- **Why:** Unlocks chapter structure, enables power-user workflow

### 3. ChapterNode + Collapsible Chapters 📖 [~6h]
- Define `ChapterNode` as `ElementNode` with `__title`, `__chapterId`, `__status` properties
- Render chapter header bar with title + status badge
- Add `CollapsiblePlugin` to toggle visibility (CSS hide/show, doesn't affect JSON)
- Create Fastify routes: `POST /chapters`, `PATCH /chapters/:id`, `GET /chapters/:id`
- Update editor auto-save to serialize chapters correctly
- **Why:** Fundamental structure, unblocks Draft Board later, needed for entity system

### 4. Entity Mention System — Phase 1 (Autocomplete) 🎯 [~6h]
- Create `EntityMentionNode` extending `TextNode` with `__entityType`, `__entityId`, `__entityName`
- Style with subtle underlines (purple=NPC, teal=location, amber=item)
- Create Fastify `/entities` endpoint with mock data: NPCs, locations, items
- Build `EntityMentionPlugin` that:
  - Watches for `@` / `#` / `!` trigger characters
  - Opens floating autocomplete dropdown from entity API
  - Replaces matched text with `EntityMentionNode`
- **Why:** Signature feature of the system, drives entity/world-building

### 5. Set Up Draft Board Shell ✨ [~3h]
- Create new `DraftBoard.tsx` component (separate Lexical composer)
- Mount alongside Novel Editor (toggle or split view)
- Begin with "sticky note" sketch mode (free-form text blocks)
- Wire up `ChapterSyncPlugin` to pull chapters from Novel Editor state
- **Why:** Separation of concerns, enables parallel planning work

---

See **[ROADMAP_2026.md](../ROADMAP_2026.md)** for the complete phased implementation plan with timelines and task checklists.

---

## Architecture Decisions

### Why Fastify for Entity/Chapter Data?
- Centralized source of truth for chapter + entity metadata
- Easy to query: `GET /entities?type=npc&q=search` for autocomplete
- Persistence layer ready for future: multi-user sync, cloud backup
- Sidecar model keeps data offline by default (privacy-first)

### Why Two Lexical Instances?
- Independent histories — no pollution between writing and planning
- Each editor optimized for its use case (focus vs. visual)
- Shared backend data keeps them consistent
- Can eventually swap, toggle, or view side-by-side

### Why Entity Mention over `@` in Regular Text?
- Consistency — can't accidentally break entity references with typos
- Queryable — find all NPCs mentioned in chapter 3
- Bidirectional — entity sidebar shows "mentions in chapters X, Y, Z"
- Type-safe — system knows it's an NPC not a location

---

## Testing Strategy

- **Unit tests** — Each plugin in isolation (Vitest + Lexical test utils)
- **Integration tests** — Plugin + Fastify backend (e.g., entity autocomplete)
- **E2E tests** — Full workflow (write chapter, mention entity, export, re-open)
- **Manual testing** — Large documents (20+ chapters), performance at scale

All tests live in `test/` directory aligned with file structure.

---

*Built on Lexical v0.41.0 — aligned with Tauri v2 + Fastify backend architecture.*