# Best Practices & Coding Patterns — Storylab

A reference guide for building new features consistently. Covers both the Lexical editor and Draft Board systems.

---

## 1. Component Architecture

### Editor Pattern
```
LexicalEditor (LexicalComposer shell)
├── FormattingToolbar
└── Plugins
    ├── ImagePlugin.tsx              (null-returning, side-effect)
    ├── ImageResizePlugin.tsx        (UI overlay)
    ├── SlashCommandPlugin/          (renders SlashPalette)
    ├── EntityMentionPlugin/         (renders palette + popover)
    ├── SceneBreakPlugin.tsx         (null-returning)
    ├── DragDropBlockPlugin.tsx      (UI overlay)
    └── ... (each file = one feature)
```

**Rule**: One plugin per feature. Plugins either return `null` (side-effect) or JSX rendered via `createPortal` into `document.body`. Never mix state into shell components.

### Draft Board Pattern
```
DraftBoard (thin shell)
└── DraftBoardCanvas (orchestrator)
    ├── useBoardState (hook: state + handlers, no JSX)
    ├── DraftBoardToolbar
    ├── ConnectionLayer (pure SVG)
    ├── BoardCard × N
    ├── EntityCardPopover
    ├── EntityCreationModal
    ├── ApplyOrderModal
    └── ... (one component file per responsibility)
```

**Rule**: Extract state into a dedicated `use<Feature>State.ts` hook. Canvas component is pure orchestrator. Each component has one co-located `.css` file.

### General Rules
- Shell components are thin — they delegate to a main layout/canvas component, never own business logic.
- No state in shell files. State lives in hooks or the canvas orchestrator.
- Each file has a single clear responsibility.

---

## 2. CSS Naming Conventions

### Three naming styles coexist—follow the pattern of existing code in each area

**kebab-case flat** (project-specific, most new code):
```css
.editor-toolbar
.draft-board-toolbar
.board-card-hover-bar
.board-card-shape
.entity-card-popover
```

**BEM with `__` and `--`** (sub-elements, modifiers):
```css
.entity-card-popover__header
.entity-chip--character
.entity-chip--location
.board-card-chapter-badge
```

**PascalCase prefix** (inherited from Lexical Playground—do not extend):
```css
.PlaygroundEditorTheme__textBold
.PlaygroundEditorTheme__h1
.Modal__overlay
```

### State modifiers—always a suffix class
```css
.format-btn.active
.board-card-wrapper.is-selected
.board-card-shape.is-dragging
.board-card-shape.is-connecting-source
```

### Import & organization
- Each component file imports its own CSS: `import './ComponentName.css'`
- Shared styles from `src/components/shared/ToolbarStyles.css` via `@import '../shared/ToolbarStyles.css'`
- CSS specificity: prefer single-class selectors. Avoid deep nesting. Use `+` combinator for adjacent state changes.

---

## 3. State Management Patterns

### Extract to dedicated hooks
For complex state (Draft Board, Editor), create a `use<Feature>State.ts` file with **no JSX**. Export a hook that returns a flat object.

```typescript
export function useBoardState(chapters) {
  const [cards, setCards] = useState([])
  const [paths, setPaths] = useState([])
  // ... all state atoms
  
  const handleDragEnd = useCallback(async (event) => { ... }, [])
  const handleAddCard = useCallback((shape) => { ... }, [])
  
  return {
    cards, paths, isLoading, error,
    handleDragEnd, handleAddCard, // ... all handlers
  }
}
```

The canvas component then destructures and uses it:
```typescript
const { cards, handleDragEnd, ... } = useBoardState(chapters)
```

### Handler naming—`handle<Verb><Noun>`
Every handler follows this pattern with no exceptions:
```typescript
handleDragEnd
handleAddCard
handleOpenEntityCreation
handleSaveEntityEdit
handleDeleteCard
handleUpdateCard
handleStartConnect
handleCancelConnect
```

### Optimistic updates
Update local state immediately before `await`—if the request fails, rollback.

```typescript
const handleDeleteCard = (cardId) => {
  setCards(cards.filter(c => c.id !== cardId)) // Optimistic
  
  deleteCard(cardId).catch(() => {
    // Rollback on error
    loadCards()
  })
}
```

### Debouncing—500ms for per-item updates
Use a `Map<id, NodeJS.Timeout>` ref to give each card its own timer:

```typescript
const updateDebounceRef = useRef(new Map())
const cardsRef = useRef(cards)

const handleUpdateCard = (cardId, patch) => {
  setCards(cards.map(c => c.id === cardId ? { ...c, ...patch } : c))
  
  const timer = updateDebounceRef.current.get(cardId)
  if (timer) clearTimeout(timer)
  
  updateDebounceRef.current.set(cardId, setTimeout(async () => {
    try {
      await updateCard(cardId, patch)
    } catch {
      // Reload from server on error
    }
  }, 500))
}
```

Mirror state in a `Ref` so the timeout callback reads current data:
```typescript
useEffect(() => {
  cardsRef.current = cards
}, [cards])
```

### Loading pattern—`Promise.all` + `finally`
```typescript
useEffect(() => {
  setIsLoading(true)
  Promise.all([getBoard(), listPaths()])
    .then(([boardData, pathsData]) => {
      setCards(boardData.cards)
      setPaths(pathsData)
    })
    .catch(err => setError(err.message))
    .finally(() => setIsLoading(false))
}, [])
```

---

## 4. Lexical Editor Plugin Patterns

### Plugin structure
Each plugin is a React component—it either returns `null` (side-effect) or JSX rendered via `createPortal`:

```typescript
// Side-effect plugin (null-returning)
const SceneBreakPlugin = () => {
  const { editor } = useLexicalComposerContext()
  
  useEffect(() => {
    return editor.registerCommand(
      INSERT_SCENE_BREAK_COMMAND,
      () => { /* insert node */ },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor])
  
  return null
}

// UI plugin (renders)
const SlashCommandPlugin = () => {
  return createPortal(
    <SlashPalette ... />,
    document.body
  )
}
```

### Plugin communication—Lexical commands only
Define commands in `src/components/editor/lexical/commands.ts`:
```typescript
export const INSERT_SCENE_BREAK_COMMAND = createCommand('INSERT_SCENE_BREAK_COMMAND')
export const INSERT_IMAGE_COMMAND = createCommand('INSERT_IMAGE_COMMAND')
```

Dispatch from anywhere:
```typescript
editor.dispatchCommand(INSERT_IMAGE_COMMAND, { cid, alt, mimeType })
```

Listen in a plugin:
```typescript
editor.registerCommand(
  INSERT_IMAGE_COMMAND,
  (payload) => {
    editor.update(() => {
      // Insert ImageNode with payload
    })
    return true
  },
  COMMAND_PRIORITY_HIGH
)
```

### Active state tracking—one listener per feature
Use `registerUpdateListener` to track selection + block type:

```typescript
editor.registerUpdateListener(({ editorState }) => {
  editorState.read(() => {
    const selection = $getSelection()
    const isBold = selection && selection.hasFormat('bold')
    const blockType = /* walk up to root to find block node type */
    
    setBold(isBold)
    setBlockType(blockType)
  })
})
```

### Block vs inline format changes
**Inline** (bold, italic, underline):
```typescript
editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
```

**Block** (heading, quote, code block):
```typescript
editor.update(() => {
  $setBlocksType(selection, () => $createHeadingNode('h1'))
})
```

### Custom nodes—extend DecoratorNode or TextNode
Required methods:
```typescript
class ImageNode extends DecoratorNode {
  static getType() { return 'image' }
  static clone(node) { return new ImageNode(...) }
  createDOM() { return document.createElement('img') }
  updateDOM() { /* apply props to DOM */ }
  exportJSON() { return { type: 'image', cid, alt } }
  static importJSON(json) { return new ImageNode(...) }
  decorate() { return <ImageComponent ... /> }
}
```

---

## 5. Drag-and-Drop Patterns (dnd-kit)

### Setup—one sensor, 5px activation threshold
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
)

return <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
  <DragOverlay>...</DragOverlay>
  {/* content */}
</DndContext>
```

### Custom ghost—DragOverlay for entities only
```typescript
<DragOverlay>
  {activeCard?.entityId ? (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '6px',
      borderLeft: `3px solid ${entityColor}`,
      background: 'white',
      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
      width: '160px',
    }}>
      {/* chip content */}
    </div>
  ) : null}
</DragOverlay>
```

### Dual ref—cards are both draggable and droppable
```typescript
const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
  id: card.id,
})
const { setNodeRef: setDroppableRef } = useDroppable({ id: card.id })

const setNodeRef = useCallback((el) => {
  setDraggableRef(el)
  setDroppableRef(el)
}, [setDraggableRef, setDroppableRef])

return <div ref={setNodeRef} {...attributes} {...listeners}>
```

### Drop logic—two branches
1. **Entity onto shape**: append entity to `linkedEntities` with duplicate guard
2. **Normal move**: clamp position to bounds, PATCH only position

```typescript
const handleDragEnd = async (event) => {
  if (!over) return // Dropped outside
  
  const activeCard = cards.find(c => c.id === event.active.id)
  const overCard = cards.find(c => c.id === over.id)
  
  // Branch 1: entity-onto-shape
  if (activeCard.entityId && overCard && !overCard.entityId) {
    setCards(cards.map(c => c.id === overCard.id
      ? { ...c, linkedEntities: [...new Set([...c.linkedEntities, activeCard])] }
      : c
    ))
    return
  }
  
  // Branch 2: normal move
  const newX = Math.max(0, Math.min(event.delta.x, 9999))
  const newY = Math.max(0, Math.min(event.delta.y, 6000))
  
  setCards(cards.map(c => c.id === event.active.id
    ? { ...c, x: newX, y: newY }
    : c
  ))
  
  await updateCardPosition(event.active.id, { x: newX, y: newY })
}
```

---

## 6. Modal & Popover Patterns

### Modal structure—always backdrop + panel pair
```typescript
<>
  <div className="entity-modal-backdrop" onClick={onClose} />
  <div className="entity-modal-panel">
    <div className="entity-modal-header">Create Entity</div>
    <div className="entity-modal-body">
      {/* form fields */}
    </div>
    <div className="entity-modal-footer">
      <button onClick={onClose}>Cancel</button>
      <button onClick={onConfirm}>Create</button>
    </div>
  </div>
</>
```

### CSS structure for modals
```css
.entity-modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: transparent; /* Click capture only */
  z-index: 29;
}

.entity-modal-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 30;
  display: flex;
  flex-direction: column;
}

.entity-modal-header {
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
  font-weight: 600;
  font-size: 15px;
}

.entity-modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entity-modal-footer {
  padding: 16px;
  border-top: 1px solid #e5e5e5;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

### Popover—anchored to a DOM rect
```typescript
const [popoverState, setPopoverState] = useState(null)

const handleEntityCardClick = (entityId, anchorRect) => {
  const entity = await getEntity(entityId)
  setPopoverState({ entity, anchorRect })
}

return popoverState ? (
  <EntityCardPopover
    entity={popoverState.entity}
    anchorRect={popoverState.anchorRect}
    onClose={() => setPopoverState(null)}
  />
) : null
```

Popover component—self-closing on outside click:
```typescript
useEffect(() => {
  const handleMouseDown = (e) => {
    if (!popoverRef.current?.contains(e.target)) {
      onClose()
    }
  }
  document.addEventListener('mousedown', handleMouseDown)
  return () => document.removeEventListener('mousedown', handleMouseDown)
}, [onClose])

return (
  <div
    ref={popoverRef}
    style={{
      position: 'fixed',
      top: anchorRect.bottom + 8,
      left: anchorRect.left,
      z-index: 5,
    }}
  >
    {/* popover content */}
  </div>
)
```

---

## 7. API & Data Fetching

### Structure—one file per resource
```
src/api/
├── documents.ts
├── draftboard.ts
├── entities.ts
└── images.ts
```

Each file exports async functions that return typed data:

```typescript
export async function getBoard(): Promise<BoardData> {
  const res = await fetch('http://localhost:3000/board')
  if (!res.ok) throw new Error(`Failed to fetch board: ${res.status}`)
  return res.json()
}

export async function updateCard(cardId: string, patch: Partial<BoardCard>): Promise<void> {
  const res = await fetch(`http://localhost:3000/board/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Failed to update card: ${res.status}`)
}
```

### Image upload
```typescript
export async function uploadImage(arrayBuffer: ArrayBuffer, mimeType: string): Promise<{ cid: string }> {
  const res = await fetch('http://localhost:3000/images', {
    method: 'POST',
    body: arrayBuffer,
    headers: { 'Content-Type': mimeType },
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}
```

### Content persistence
The editor fires `onContentChange(serialisedState, wordCount)` synchronously on every mutation. The parent/shell component owns debouncing and persistence. Do not debounce inside the editor.

---

## 8. Entity Type System

### Single source of truth
**File**: `src/components/draftboard/entityConstants.ts`

```typescript
export const BADGE_ICONS = {
  character: User,
  location: MapPin,
  item: Package,
}

export const ENTITY_LABELS = {
  character: 'Person',
  location: 'Location',
  item: 'Item',
}

export const ENTITY_BADGE_COLORS = {
  character: { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.05)', text: '#7c3aed' },
  location:  { border: '#0d9488', bg: 'rgba(13, 148, 136, 0.05)',  text: '#0d9488' },
  item:      { border: '#b45309', bg: 'rgba(180, 83, 9, 0.05)',    text: '#b45309' },
}

export const ENTITY_CHIP_COLORS = {
  character: '#7c3aed',
  location: '#0d9488',
  item: '#b45309',
}
```

### Usage
**Never hardcode colours**. Always import from `entityConstants`:

```typescript
import { ENTITY_CHIP_COLORS, BADGE_ICONS } from './entityConstants'

const Icon = BADGE_ICONS[entity.type]
const color = ENTITY_CHIP_COLORS[entity.type]
```

### Card background colours
Live in `src/components/draftboard/useBoardState.ts:ENTITY_COLOURS`. When adding new entity types, consolidate into `entityConstants.ts`.

---

## 9. Accessibility Patterns

### Icon-only buttons—aria-label + title
```typescript
<button
  aria-label="Delete card"
  title="Delete card"
  onClick={onDelete}
>
  <X size={14} />
</button>
```

### Active toggle buttons
```typescript
<button
  aria-pressed={isBold}
  onClick={toggleBold}
  className={isBold ? 'active' : ''}
>
  <Bold size={16} />
</button>
```

### Toast live region
```typescript
<div aria-live="polite" aria-atomic="false" role="region">
  {toasts.map(toast => (
    <div key={toast.id} role="alert" aria-live="assertive">
      <X size={16} aria-hidden="true" />
      {toast.message}
    </div>
  ))}
</div>
```

### Focus ring—consistent blue outline
```css
button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

input:focus {
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}
```

### Dropdown keyboard navigation
- Items are `<button type="button">` for native support
- Focus returns to trigger on close: `buttonRef.current.focus()`
- Arrow keys move focus to highlighted item: `highlightedItem.current.focus()`
- Dropdown items accept `Tab` to close and move to next focusable element

---

## 10. Testing Conventions

### Frontend tests—Vitest + React Testing Library
- Location: `test/frontend/**/*.test.{ts,tsx}`
- Query by role/text/label, not id/class: `screen.getByRole('button', { name: /delete/i })`
- Use `userEvent` for realistic interactions: `await userEvent.click(button)`
- Mock `fetch` for API calls:
  ```typescript
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ id: '123' }),
    })
  )
  ```
- Run: `npm run test:frontend`

### General rules for tests
- Assert on visible output, not implementation
- Use `waitFor` for async state changes
- Clean up renders with `afterEach` if needed
- One logical assertion per test case

---

## 11. General Rules Summary

- **Co-locate CSS**: `ComponentName.css` next to `ComponentName.tsx`
- **Shared CSS**: `src/components/shared/` only for truly cross-component styles
- **No inline styles for layout**: Use CSS classes. Inline styles only for dynamic values (position, z-index, entity colours)
- **No state in shells**: State lives in hooks (`use<Feature>State.ts`)
- **One responsibility per file**: Thin shells, focused components
- **Test first**: Validate changes with tests, not manual iteration
- **Follow existing patterns**: If uncertain, find similar code and match its style

