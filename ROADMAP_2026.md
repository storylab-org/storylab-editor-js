# Storylab Roadmap 2026 — Current Status & Next Actions

> Updated April 7, 2026 — Reflecting actual implementation state (v0.2.51)

## What's Done ✅ (All Phases Complete)

### Phase 1: Core Writing ✅
- Lexical v0.41.0 editor with full toolbar
- Auto-save to chapter state
- Sidebar chapter management
- Image upload & resizing with persistence
- File storage API (blockstore + documents)
- Tauri + Fastify architecture complete
- TypeScript strict mode + comprehensive test infrastructure

### Phase 2: Scene Structure ✅
- **SceneBreakNode** — visual `* * *` scene separators
- Scene breaks render cleanly in exports
- Integrated with slash command plugin

### Phase 3: Entity System ✅ (Complete)
- **EntityMentionNode** with autocomplete
- Type `@Character`, `#Location`, `!Item`
- Coloured underlines (purple/teal/amber)
- Full Entity API (GET, POST, PATCH, DELETE)
- Entity cards on draft board with drag-to-assign
- Click-to-assign chapter linking
- Entity card colors match across editor and board
- Prevent duplicate entity attachments

### Phase 4: Annotations & Comments ✅
- **AnnotationPlugin** with floating toolbar
- Multi-block markers (draft-note, needs-revision, dm-aside)
- Author notes on each annotation
- Sidebar panel listing all annotations
- Comment API with full CRUD
- Annotations strip on export (dm-aside filtered)

### Phase 5: Draft Board ✅ (Complete)
- **Draft Board Canvas** with free-form drag-and-drop
- Geometric card shapes with chapter preview
- **Arrow connections** between chapters (scene flow mapping)
- **ConnectionLayer** with viewport-aware rendering
- Chapter path ordering & hierarchy visualization
- Entity cards displayed on board
- Entity attachment/detachment UI
- TreeViewPlugin for outline view

### Phase 6: Export & Polish ✅ (Mostly Complete)
- ✅ Markdown export
- ✅ HTML export
- ✅ DOCX export
- ✅ EPUB export (4 export formats functional)
- ✅ Auto-conversion of nodes for portability
- ✅ Annotation stripping (dm-aside)
- ⏳ CID export (minor edge case remaining)

### Additional Features Implemented
- **SlashCommandPlugin** — 8+ commands with icons (`/h1`, `/h2`, `/h3`, `/quote`, `/code`, `/table`, `/hr`, `/image`)
- **WordCountPlugin** — real-time word count per chapter
- **TablePlugin** — insert & edit tables via modal
- **LinkPlugin** with click-to-open
- **AutoLinkPlugin** for automatic URL detection
- **TableOfContentsPlugin** for chapter navigation
- **DragDropBlockPlugin** for block reordering
- **ImageResizePlugin** — proportional resize with SE corner handle

## Test Coverage

- **Frontend**: 96 tests passing (Vitest + React Testing Library)
- **Server**: 60+ tests passing (Node test framework + integration tests)
- **Rust**: 4 tests passing (Tauri sidecar)
- **Coverage**: 70%+ across frontend + server

## What's Next (April 2026 Onwards)

### Immediate (Week 1-2) — Data & Performance ✅

✅ **Chapter Content Cache** (Complete)
   - In-memory cache in EditorLayout prevents re-fetches on chapter revisits
   - Instant switching between previously-visited chapters
   - Correct cache invalidation on save and delete
   - 100 tests passing (added 4 new cache contract tests)

### Week 5-6: Find & Replace ✅ (Complete)

✅ **FindReplacePlugin** (Complete)
   - Cmd/Ctrl+F opens floating panel
   - Real-time search with 150ms debounce
   - Case-sensitive toggle
   - Match count display ("3 of 12")
   - Navigate: Prev/Next with wrapping
   - Replace current match
   - Replace All in single undo entry
   - Offset-safe algorithm (rightmost-first)
   - 25 tests, all passing

### Week 3-4: UX Polish (Deferred)

3. **Keyboard Shortcuts**
   - Add keyboard ref modal (Cmd+?)
   - Common shortcuts: Bold (Cmd+B), Italic (Cmd+I), Slash commands (Cmd+/)
   - Vim mode (optional, stretch goal)

4. **Typewriter Mode**
   - Focus paragraph centred
   - Auto-scroll on write
   - Toggle via sidebar or Cmd+T

### Week 5-6: Find & Replace

5. **FindReplacePlugin**
   - Ctrl/Cmd+F search & highlight
   - Replace one or all
   - Case-sensitive option
   - Regex support (optional)

### Week 7-8: (Skipped — No Multi-User Needed)

### Week 9-10: Data Persistence

7. **Database Migration (if needed)**
   - Migrate from JSON files → SQLite (local) or PostgreSQL (remote)
   - Only if performance testing shows lag at scale
   - Current limits: 1000 chapters, 5000 entities per single-user app

### Beyond (Polish & Distribution)

- [ ] Markdown import
- [ ] Reading time per chapter (sidebar)
- [ ] Version history / snapshots UI
- [ ] Writing stats dashboard
- [ ] Custom font sizes (serif/sans-serif)
- [ ] Dark mode
- [ ] Auto-complete entity names (ghost text)

---

## Architecture Notes

### File-Based Storage (Current)
- JSON files in `~/.storylab/`
- Works fine for single-user, small-scale (100–1000 chapters)
- Migration to SQLite/PostgreSQL around Week 9-10 if needed

### Plugin System
All features integrated as Lexical plugins:
- **Editor plugins**: SlashCommand, Annotation, EntityMention, SceneBreak, Image, Table
- **Board plugins**: DraftBoard, ConnectionLayer, EntityCards
- **Utilities**: WordCount, TableOfContents, LinkClick, AutoLink

### Test Strategy
- Unit tests for store logic (annotation-store, entity-store)
- Integration tests for API routes (documents, entities, annotations, draftboard)
- Frontend component tests (InsertTableDialog, EditorLayout, SceneBreakNode)
- Manual smoke tests: chapter creation → entity mention → export → reload

---

## Success Metrics (Updated)

### Phase 1 ✅
- [x] Editor handles 10k+ word documents smoothly
- [x] SlashCommandPlugin works reliably
- [x] Image upload with validation (5MB limit)

### Phase 2–6 ✅
- [x] Scene breaks render correctly
- [x] Entity mentions autocomplete < 200ms
- [x] Annotations with author notes functional
- [x] Draft board renders all chapters as cards
- [x] Exports to 4 formats (Markdown, HTML, DOCX, EPUB)
- [x] 160+ tests passing, all green CI

### Next Milestone
- [ ] Performance stress test (50+ chapters, 500+ entities)
- [ ] Find & Replace feature complete
- [ ] Keyboard shortcuts documented & working
- [ ] Ready for beta testing with DMs

---

## Infrastructure & Operations

### Current Stack
- **Frontend**: React 19.1 + Lexical 0.41 + Lucide-React icons
- **Server**: Fastify 5.8.2 + Node.js
- **Desktop**: Tauri 2.0 + Rust
- **Storage**: File-based JSON (ready to migrate to SQLite when needed)

### Deployment
- Single-user desktop app (Tauri)
- No database setup required
- Self-contained with sidecar server

### Monitoring
- Structured logging (Pino server, browser console frontend)
- Performance profiling at scale
- Error tracking in logs

---

## Questions & Decisions Ahead

1. **Multi-user now or later?** Current architecture is single-user. Real-time collab requires Yjs sync + conflict resolution (Week 7-8).
2. **Database migration trigger?** Performance testing will tell us. Estimate: if >100MB file size or >5k entities with lag.
3. **Export formats priority?** CID export remaining; others 100% done. Low priority unless needed for specific workflow.
4. **Native shortcuts vs Electron-style?** Tauri handles Cmd+* natively. Plan keyboard ref modal early.

---

## Next Immediate Action

**Start with performance & stability review:**

1. Create test data (50 chapters, 500 entities, 100+ annotations)
2. Profile memory usage & responsiveness
3. Test undo/redo integrity across all features
4. Document any bottlenecks

**Estimated time**: 2–3 hours including profiling.

Why next? Solid foundation needed before polishing UX. Running at scale reveals real issues that unit tests miss.

---

**For full architecture & development guide, see:**
- `docs/ARCHITECTURE.md` — System design
- `docs/DEVELOPMENT.md` — Dev workflow
- `docs/TESTING.md` — Testing guide
- `CONTRIBUTING.md` — Plugin development
- `DESIGN.md` — Design system & best practices
