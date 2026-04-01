# Storylab Roadmap 2026 — Next Actions

> Updated April 2026 — Prioritized for immediate implementation

## What's Done ✅

- Lexical v0.41.0 editor with full toolbar
- Auto-save to chapter state
- Sidebar menu with export scaffold
- Image resizing with persistence
- File storage API (blockstore + documents)
- Tauri + Fastify architecture in place
- TypeScript strict mode + test infrastructure
- **WordCountPlugin** — real-time word count via `registerTextContentListener`
- **SlashCommandPlugin** ⭐ — command palette with 8 commands
  - `/h1`, `/h2`, `/h3`, `/quote`, `/code`, `/table`, `/hr`, `/image`
  - Cursor-anchored with keyboard navigation (↑↓, Enter, Esc)
  - Real Lucide React icons + consistent UI spacing
  - Image file picker with validation (max 5MB)
  - Viewport-aware positioning
- **Export Formats** (Phase 6 mostly done) — Markdown, HTML, DOCX, EPUB
  - Only CID export missing; all other formats implemented

## What's Next (Ordered by Impact & Effort)

### 🎯 Next Week: Chapter Structure

---

1. **SceneBreakNode** (~3h)
   - Custom decorator node for visual scene separators
   - Renders as horizontal line or custom SVG
   - Serialises cleanly on export

2. **ChapterNode** (~6h)
   - Custom container node with title, status, metadata
   - Renders chapter header bar with status badge
   - Collapsible plugin for fold/unfold
   - Stores `chapterId`, `title`, `status`, `synopsis`

3. **Backend: Chapter API** (~4h)
   - `POST /chapters`, `GET /chapters/:id`, `PATCH /chapters/:id`, `DELETE /chapters/:id`
   - Store chapter metadata separately from document content
   - Update auto-save logic to sync both

**Why?** Fundamental structure. Unblocks entity system and Draft Board.

---

### 🎯 Week 3–4: Entity Mention System (Highest Impact) ← NEXT MAJOR FEATURE

4. **Entity API** (~4h)
   - `GET /entities?type=character`, `POST /entities`, `PATCH /entities/:id`
   - Mock data: 10–20 characters, 5–10 locations, 10–15 items
   - Full CRUD on backend

5. **EntityMentionNode** + **EntityMentionPlugin** (~8h)
   - Type `@Arya` or `#Winterfell` or `!Dragonsteel` → autocomplete dropdown
   - Visual styling: coloured underlines (purple=character, teal=location, amber=item)
   - Click to open entity side panel (scaffold for now)

**Why?** The signature feature. Drives world-building. Makes writing more powerful.

---

### 📝 Week 5–6: Annotation & Comments

6. **FloatingToolbarPlugin** + **MarkerNode** (~6h)
   - Selection-triggered toolbar (bold, italic, markers)
   - Highlight categories: draft-note, needs-revision, dm-aside
   - Sidebar panel listing all markers

7. **MarginCommentPlugin** (~4h)
   - Comments stored in Fastify (separate from document)
   - Render in right gutter, scroll in sync
   - Full CRUD via API

**Why?** Collaboration + editing layer. Moves toward multi-user setup.

---

### ✨ Week 7–8: Draft Board (Planning)

8. **Draft Board Editor** + **ChapterSyncPlugin** (~8h)
   - Second Lexical instance for planning
   - Pulls chapters from backend, displays as cards
   - Toggle or split-view layout
   - Drag to reorder chapters (updates backend)

**Why?** Separates writing from planning. High UX value.

---

### 📤 Week 9–10: Export Pipeline & Find/Replace

9. **ExportPlugin** (mostly ✅, CID export remaining)
    - ✅ Markdown, HTML, DOCX, EPUB formats implemented
    - ✅ Strip dm-aside annotations before export
    - ✅ Fastify handles format conversion
    - ⏳ CID export to finish

10. **FindReplacePlugin** (~4h)
    - Ctrl/Cmd+F search & replace
    - Highlight all matches
    - Replace one or all

**Why?** Unlocks distribution. Needed for real writing workflows.

---

## Feature Wishlist (Lower Priority)

- [ ] Typewriter mode (focus paragraph centered)
- [ ] Auto-complete entity names (ghost text)
- [ ] Reading time per chapter (in sidebar)
- [ ] Version history / snapshots
- [ ] Collaborative editing (Yjs sync)
- [ ] Markdown import
- [ ] Writing stats dashboard
- [ ] Custom font sizes
- [ ] Dark mode
- [ ] Keyboard shortcuts reference

---

## Testing Plan

For each feature, write:
- **Unit tests** — Vitest, plugin in isolation
- **Integration tests** — Plugin + Fastify (e.g., entity autocomplete)
- **Manual smoke test** — Create chapter, add entity, export, reload

Maintain 70%+ code coverage. Run `npm test` before every PR.

---

## Risk Mitigation

### Performance at Scale
- Test with 50+ chapters, 500+ entities
- Profile word count plugin (debounce if needed)
- Monitor Fastify response times

### Data Integrity
- Validate all chapter/entity metadata on backend
- Don't let editor create orphaned entities
- Soft deletes for chapters (archive rather than remove)

### User Experience
- Plugin order: rich-text → history → word-count → slash → chapter → entity
- Test undo/redo at each step
- Watch for selection toolbar fighting with native context menu

---

## Success Metrics

### Phase 1 ✅
- [x] Editor handles 10k+ word documents smoothly
- [x] SlashCommandPlugin works reliably with keyboard + mouse
- [x] Image upload validation (5MB limit enforced)
- [x] 82+ tests passing, all green CI
- [x] Placeholder hints user about `/` commands

### Phase 2 (Current)
- [ ] Chapter structure functional with collapsible UI
- [ ] Per-chapter word counts working
- [ ] 90+ tests passing

### Phase 6 (Mostly Done)
- [x] Export to Markdown, HTML, DOCX, EPUB works cleanly
- [ ] CID export remaining

### Future
- [ ] Entity autocomplete < 200ms
- [ ] Draft Board renders all chapters as cards
- [ ] Usable by non-technical DMs within 5 minutes of first load

---

## Next Immediate Action

**Start with `ChapterNode` + `CollapsiblePlugin`:**

The slash command plugin is complete and working. Next is chapter structure:

1. Define `ChapterNode` extending `ElementNode`
   - Properties: `__title`, `__chapterId`, `__status` (draft/revision/final), `__synopsis`
   - Renders chapter header bar with title + status badge
   - Stores chapter metadata for persistence

2. Create `CollapsiblePlugin`
   - Toggle button on chapter header
   - CSS hide/show content (doesn't affect JSON)
   - Remember collapsed state during session

3. Add Fastify routes
   - `POST /chapters` — create new chapter
   - `GET /chapters/:id` — fetch chapter with metadata
   - `PATCH /chapters/:id` — update title/status/synopsis
   - `DELETE /chapters/:id` — soft delete (archive)

4. Update auto-save logic
   - Serialize chapters with metadata when document changes
   - POST to Fastify alongside document content

**Estimated time:** 6–8 hours including tests.

Why next? Fundamental structure that unblocks entity mentions and Draft Board.

---

**Questions?** See `docs/DM_STORYBOOK.md` for full plugin architecture & code examples.
