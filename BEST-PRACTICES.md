# Best Practices — Storylab Editor

This document outlines conventions for code structure, component design, and architecture across the Storylab Editor codebase.

## Table of Contents

1. [Component Structure](#component-structure)
2. [Custom Hooks](#custom-hooks)
3. [Modals & Dialogs](#modals--dialogs)
4. [File Organization](#file-organization)
5. [TypeScript](#typescript)
6. [Testing](#testing)
7. [State Management](#state-management)

---

## Component Structure

### One Component Per File

Each React component lives in its own file. No inline component definitions inside other components (except small, single-use helpers like `<DropdownItem />` that appear exactly once).

```typescript
// ❌ BAD: multiple components in one file
export function Parent() {
  const ChildComponent = () => <div>child</div>
  return <ChildComponent />
}

// ✅ GOOD: each component is a separate file
// components/Parent.tsx
export default function Parent() {
  return <Child />
}

// components/Child.tsx
export default function Child() {
  return <div>child</div>
}
```

### Minimal JSX Logic

JSX should contain only bindings, simple conditionals, and `.map()` calls. Complex logic lives in custom hooks or helper functions.

```typescript
// ❌ BAD: complex logic in JSX
<div>
  {chapters.filter(c => c.order !== activeChapterId).map(c => {
    const cached = contentCacheRef.current.get(c.id)
    const isSame = c.id === activeChapterId
    return <Item key={c.id} {...isSame ? { highlighted: true } : {}} />
  })}
</div>

// ✅ GOOD: logic in hook/helper
const visibleChapters = useMemo(() => 
  chapters.filter(c => c.id !== activeChapterId),
  [chapters, activeChapterId]
)
return (
  <div>
    {visibleChapters.map(c => <Item key={c.id} />)}
  </div>
)
```

### Props are Single-Level

Props interfaces should be flat and readable. Avoid deeply nested objects unless absolutely necessary.

```typescript
// ❌ BAD: deep nesting
interface EditorProps {
  config: {
    settings: {
      appearance: {
        theme: string
      }
    }
  }
}

// ✅ GOOD: flat props
interface EditorProps {
  theme: string
  showToolbar: boolean
  onSave: () => void
}
```

---

## Custom Hooks

### Hook Naming & Exports

All custom hooks are **named exports** (not default exports) and follow the `useX` convention.

```typescript
// ❌ BAD: default export
export default function useChapters() { }

// ✅ GOOD: named export
export function useChapters() { }

// Usage
import { useChapters } from '@/hooks/useChapters'
```

### Hook Responsibility

Each hook owns exactly one concern and lives in `src/hooks/`.

| Hook | Owns | Returns |
|------|------|---------|
| `useChapters` | chapter list, activeChapterId, chapter operations (CRUD, reorder) | chapters, activeChapterId, handlers, refreshChapters |
| `useChapterContent` | content, dirty state, save status, autosave | content, setContent, isDirty, saveStatus, loadedChapterId, handleSave |
| `useChapterSettings` | per-chapter settings (background, drag menu, etc.) | chapterSettings, handlers |
| `useExportImport` | export/import handlers + modal state | modal state, handlers |
| `useTauriMenuEvents` | Tauri menu-event listener | (none — side-effect only) |

### No Side-Effect Leakage

Hooks should not trigger side-effects outside their scope. If a hook needs to call another hook's function, accept it as a callback argument.

```typescript
// ❌ BAD: useChapters triggers handleSave internally (unknown side-effect)
export function useChapters() {
  const handleSave = useCallback(() => { /* ... */ }, [])
  
  const handleSelectChapter = useCallback(async (id: string) => {
    await handleSave() // Where did this come from? Hidden dependency.
  }, [handleSave])
}

// ✅ GOOD: hook accepts callback
export function useChapters(onSaveBeforeSwitch: () => Promise<void>) {
  const handleSelectChapter = useCallback(async (id: string) => {
    if (isDirty) {
      await onSaveBeforeSwitch()
    }
    setActiveChapterId(id)
  }, [isDirty, onSaveBeforeSwitch])
}
```

---

## Modals & Dialogs

### Modal File Location

All modals (except shared primitives like `GenericModal.tsx`) live in `src/components/modals/`.

```
src/components/
  ├── modals/
  │   ├── ImportConfirmModal.tsx
  │   ├── ExportFilenameModal.tsx
  │   ├── HelpModal.tsx
  │   └── ChapterSettingsModal.tsx
  ├── shared/
  │   └── GenericModal.tsx       (shared primitive)
  └── ...
```

### Modal Props Interface

Every modal has a consistent interface:

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  // Modal-specific props below
  title?: string
  onConfirm?: () => void
  format?: string
  // ...
}
```

### Wrapping GenericModal

All modals should wrap `GenericModal` (the shared primitive) and focus on content.

```typescript
// ✅ GOOD: modal wraps GenericModal
export function ImportConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  format,
}: ImportConfirmModalProps) {
  return (
    <GenericModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Import ${format.toUpperCase()}`}
    >
      <div>
        {/* Modal content here */}
      </div>
    </GenericModal>
  )
}
```

---

## File Organization

### Folder Structure

```
src/
├── components/
│   ├── modals/                 # Modal components (one per file)
│   │   ├── ImportConfirmModal.tsx
│   │   ├── ExportFilenameModal.tsx
│   │   └── HelpModal.tsx
│   ├── shared/                 # Reusable primitives
│   │   ├── GenericModal.tsx
│   │   ├── ToastContext.tsx
│   │   └── ToastContainer.tsx
│   ├── layout/
│   │   └── EditorLayout.tsx    # Main coordinator
│   ├── editor/
│   │   ├── EditorArea.tsx
│   │   ├── EditorToolbar.tsx
│   │   └── ...
│   ├── draftboard/
│   │   ├── DraftBoard.tsx
│   │   └── ...
│   └── sidebar/
│       └── Sidebar.tsx
├── hooks/                       # Custom hooks (one per file)
│   ├── useChapters.ts
│   ├── useChapterContent.ts
│   ├── useChapterSettings.ts
│   ├── useExportImport.ts
│   └── useTauriMenuEvents.ts
├── api/                         # API layer
│   ├── documents.ts
│   ├── export.ts
│   ├── import.ts
│   └── ...
├── utils/                       # Pure utilities
│   ├── keyboardUtils.ts
│   └── wordCount.ts
└── constants.ts
```

### Imports Use Aliases

Always use path aliases (`@/`) instead of relative paths.

```typescript
// ❌ BAD: relative paths
import { useChapters } from '../../../hooks/useChapters'

// ✅ GOOD: path aliases
import { useChapters } from '@/hooks/useChapters'
```

---

## TypeScript

### Strict Mode Enabled

All code is written with `strict: true` in `tsconfig.json`. No `any` types, no unused variables or parameters.

```typescript
// ❌ BAD: implicit any
function handleEvent(e) { }

// ✅ GOOD: explicit types
function handleEvent(e: KeyboardEvent): void { }
```

### Type Interfaces Over Types

Use `interface` for component props and public APIs. Use `type` for type aliases and discriminated unions.

```typescript
// ✅ GOOD: interface for props
interface ChapterProps {
  id: string
  name: string
}

// ✅ GOOD: type for unions
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
```

### No Unused Exports

Don't export types, helpers, or constants that aren't used outside their module. Keep exports minimal.

```typescript
// ❌ BAD: unused export
export const internalHelper = () => { }

// ✅ GOOD: only export what's needed
export function useChapters() { }
```

---

## Testing

### Test File Location

Tests live alongside their source code:

```
src/
├── hooks/
│   ├── useChapters.ts
│   ├── useChapters.test.ts       # Alongside source
│   ├── useChapterContent.ts
│   └── useChapterContent.test.ts
└── utils/
    ├── wordCount.ts
    └── wordCount.test.ts
```

Or in the centralized `test/` folder for integration/end-to-end tests.

### Testing Patterns

- Use **Vitest** for unit tests (hooks, utilities, business logic)
- Mock external dependencies (API calls, Tauri events) at the API boundary
- Integration tests use real backends where possible
- See `docs/TESTING.md` for detailed patterns

---

## State Management

### Where State Lives

1. **Component state** — simple, local state (open/closed, input value)
2. **Custom hooks** — domain-specific state (chapters, content, settings)
3. **Context** — cross-cutting concerns (toast notifications, theme)
4. **Server cache** — fetch once, reuse (chapters list, chapter content)

```typescript
// ❌ BAD: lifting state too high
function EditorLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false)  // Too high-level
  return <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
}

// ✅ GOOD: modal owns its own state (or it's in a hook if complex)
function Modal() {
  const [isOpen, setIsOpen] = useState(false)  // Component-level state
  return <GenericModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
}
```

### localStorage Use

localStorage is only for:
- Active chapter ID (for session restoration)
- Per-chapter settings (background colour, etc.)

For everything else, fetch from the server.

```typescript
// ✅ GOOD: localStorage for session state
localStorage.setItem('active-chapter-id', chapterId)

// ✅ GOOD: localStorage for settings
localStorage.setItem(`chapter-settings-${chapterId}`, JSON.stringify(settings))

// ❌ BAD: localStorage for business data (use server cache instead)
localStorage.setItem('all-chapters', JSON.stringify(chapters))
```

### useRef for Non-State Values

Use `useRef` only for:
- Timeout/interval IDs (autosave timer)
- DOM references (focus, scroll)
- Closures over stale values (Tauri event listener refs)

Don't use `useRef` for state that should trigger re-renders.

```typescript
// ✅ GOOD: useRef for autosave timer
const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// ✅ GOOD: useRef for event listener cleanup
let unlistenRef = useRef<(() => void) | null>(null)

// ❌ BAD: useRef for state (use useState instead)
const countRef = useRef(0)  // Won't trigger re-renders!
```

---

## Key Decisions

See `docs/ARCHITECTURE.md` for detailed rationale behind the three-layer architecture, Lexical integration, Tauri approach, and design decisions.

## Further Reading

- `docs/ARCHITECTURE.md` — system design, data flow
- `docs/DEVELOPMENT.md` — workflow, debugging, common tasks
- `docs/TESTING.md` — testing patterns, running tests
