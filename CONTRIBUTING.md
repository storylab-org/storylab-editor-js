# Contributing to Storylab Editor

Thank you for your interest in contributing to **Storylab**, an open-source desktop editor for writers using Tauri, React, and Lexical.

This guide focuses on the primary way to extend Storylab: **writing custom Lexical plugins**. We welcome contributions that enhance the writing experience—new formatting options, editing tools, content structure features, and integrations with the backend.

## Quick Links

- **[Official Lexical Documentation](https://lexical.dev/)** — Complete plugin architecture, examples, API reference
- **[Project Roadmap](ROADMAP_2026.md)** — Prioritised features and next actions
- **[Architecture Overview](docs/ARCHITECTURE.md)** — Three-layer system design (Tauri + React + Fastify)
- **[Lexical Plugin Stack](docs/DM_STORYBOOK.md)** — Current plugins, custom nodes, integration patterns
- **[Editor Toolbar Guide](docs/EDITOR_TOOLBAR.md)** — Existing toolbar features and how they work
- **[Development Guide](docs/DEVELOPMENT.md)** — Setup, debugging, common commands
- **[Testing Guide](docs/TESTING.md)** — Test patterns for frontend, server, and Rust layers

## How to Contribute

### 1. Start with the Roadmap

Check [ROADMAP_2026.md](ROADMAP_2026.md) to see what's planned. The next priorities are:

- **Phase 2** — ChapterNode + CollapsiblePlugin (document structure)
- **Phase 3** — EntityMentionPlugin (entity autocomplete)
- **Phase 4** — FloatingToolbarPlugin + MarkerNode (annotations)
- **Phase 5** — Draft Board (separate planning editor)

If you want to work on something not listed, **open an issue first** to discuss the feature.

### 2. Understand the Architecture

Storylab has three layers:

```
┌─────────────────────────────────────────────┐
│ React Frontend (Tauri Webview, Port 1420)   │
│ - Lexical editor with plugins               │
│ - Toolbar, sidebar, UI components           │
└──────────────────┬──────────────────────────┘
                   │ HTTP (localhost:3000)
┌──────────────────▼──────────────────────────┐
│ Fastify Server (Node.js Sidecar, Port 3000) │
│ - Document persistence                      │
│ - Entity management                         │
│ - Image uploads, export processing          │
└──────────────────┬──────────────────────────┘
                   │ stdio
┌──────────────────▼──────────────────────────┐
│ Tauri/Rust (Desktop Shell)                  │
│ - App lifecycle, file dialogs               │
│ - Spawns and manages server sidecar         │
└─────────────────────────────────────────────┘
```

**Key principle:** Plugin logic runs in React (frontend), backend logic runs in Fastify (server).

### 3. Anatomy of a Lexical Plugin

A Lexical plugin is a React component that:

1. **Registers custom nodes** (if needed)
2. **Registers command handlers** (if needed)
3. **Mounts inside `<LexicalComposer>`**
4. **Manages editor state via Lexical's API**

**Minimal plugin template:**

```typescript
// src/components/editor/lexical/plugins/MyPlugin.tsx

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import { COMMAND_PRIORITY_NORMAL } from 'lexical'

export function MyPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Register command handlers here
    return editor.registerCommand(
      MY_CUSTOM_COMMAND,
      (payload) => {
        // Handle command
        return true
      },
      COMMAND_PRIORITY_NORMAL
    )
  }, [editor])

  return null // Plugins are invisible; they manipulate editor state
}
```

Then mount it in the editor:

```typescript
// src/components/editor/LexicalEditor.tsx

<LexicalComposer initialConfig={config}>
  <RichTextPlugin /* ... */ />
  <HistoryPlugin />
  <MyPlugin /> {/* Add your plugin here */}
</LexicalComposer>
```

### 4. Custom Nodes

If your plugin needs to store special content, create a custom node:

```typescript
// src/components/editor/lexical/nodes/MyNode.ts

import { ElementNode, SerializedElementNode, Spread } from 'lexical'

export type SerializedMyNode = Spread<
  {
    type: 'my-node'
    version: 1
  },
  SerializedElementNode
>

export class MyNode extends ElementNode {
  static getType(): string {
    return 'my-node'
  }

  static clone(node: MyNode): MyNode {
    return new MyNode(node.__key)
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'my-node'
    return div
  }

  updateDOM(): false {
    return false
  }

  exportJSON(): SerializedMyNode {
    return {
      ...super.exportJSON(),
      type: 'my-node',
      version: 1,
    }
  }

  static importJSON(serializedNode: SerializedMyNode): MyNode {
    return new MyNode()
  }
}
```

Then register it in the editor config:

```typescript
const config: InitialConfigType = {
  nodes: [MyNode, ...otherNodes],
  // ...
}
```

**For detailed guidance, see [Lexical documentation on nodes](https://lexical.dev/docs/concepts/nodes).**

### 5. Integration with Fastify Backend

If your plugin needs persistence, API calls, or data processing:

1. **Create a server route** (`server/src/routes/my-route.ts`):

```typescript
import { FastifyPluginAsync } from 'fastify'

const myRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/my-data', async (request, reply) => {
    const data = request.body
    // Process, validate, persist
    return { status: 'ok', data }
  })
}

export default myRoute
```

2. **Call from the plugin** using `fetch`:

```typescript
const response = await fetch('http://localhost:3000/my-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
```

3. **Write tests** for the route (`test/server/routes/my-route.test.ts`).

See [docs/SIDECAR.md](docs/SIDECAR.md) for complete server setup.

### 6. Testing Your Plugin

Write **unit tests** for your plugin using **Vitest** + **React Testing Library**:

```typescript
// test/frontend/plugins/MyPlugin.test.tsx

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestEditor } from '../helpers'

describe('MyPlugin', () => {
  it('should insert content on command', async () => {
    const { editor } = render(<TestEditor plugins={[MyPlugin]} />)
    const user = userEvent.setup()

    // Type trigger
    await user.type(editor, '/my-command')

    // Verify result
    expect(screen.getByText('expected result')).toBeInTheDocument()
  })
})
```

See [docs/TESTING.md](docs/TESTING.md) for full testing patterns.

### 7. Documentation

Document your plugin in a new file: `docs/MY_PLUGIN.md`

Include:
- **Overview** — What does it do?
- **Features** — Keyboard shortcuts, UI elements, behaviour
- **Installation** — How to enable it
- **API** — Custom commands, configuration options
- **Examples** — Code snippets showing common use cases
- **Backend integration** — Any Fastify routes or data model changes

See [docs/EDITOR_TOOLBAR.md](docs/EDITOR_TOOLBAR.md) and [docs/DM_STORYBOOK.md](docs/DM_STORYBOOK.md) as examples.

## Current Plugin Stack

The editor currently includes:

| Plugin | Purpose | Status |
|--------|---------|--------|
| `RichTextPlugin` | Foundation: keyboard, clipboard, copy/paste | ✅ Active |
| `HistoryPlugin` | Undo/redo stack | ✅ Active |
| `ListPlugin` | Bullet and numbered lists | ✅ Active |
| `TablePlugin` | Embedded tables | ✅ Active |
| `LinkPlugin` | Hyperlinks | ✅ Active |
| `FormattingToolbar` | Toolbar UI (block types, bold, italic, etc.) | ✅ Active |
| `WordCountPlugin` | Real-time word count | ✅ Active |
| `SlashCommandPlugin` | Command palette (`/h1`, `/h2`, `/code`, etc.) | ✅ Active |
| `ImagePlugin` | Image upload and resize | ✅ Active |
| `ChapterNode` | Chapter structure | ⏳ Planned |
| `EntityMentionPlugin` | `@character`, `#location` autocomplete | ⏳ Planned |
| `FloatingToolbarPlugin` | Selection-triggered toolbar | ⏳ Planned |
| `MarkerNode` | Annotations (draft-note, needs-revision, etc.) | ⏳ Planned |
| `DraftBoardPlugin` | Separate planning editor | ⏳ Planned |

## Getting Started

### Setup

```bash
# Clone the repository
git clone https://github.com/storylab-org/storylab.git
cd storylab

# Install dependencies
npm install && npm install --prefix server

# Start development
npm run tauri dev
```

### Project Structure

```
src/components/editor/
├── LexicalEditor.tsx                    # Main editor component
├── FormattingToolbar.tsx                # Toolbar UI
├── lexical/
│   ├── nodes/
│   │   ├── ImageNode.tsx
│   │   └── ... other custom nodes
│   └── plugins/
│       ├── WordCountPlugin.tsx
│       ├── SlashCommandPlugin.tsx
│       ├── ImagePlugin.tsx
│       └── ... other plugins
```

### Useful Commands

```bash
# Run all tests (frontend + server + Rust)
npm test

# Run only frontend tests
npm run test:frontend

# Run only server tests
npm run test:server

# Start dev environment with debug logs
RUST_LOG=debug npm run tauri dev

# Check TypeScript
npm run build

# Format code
npm run format
```

## Code Conventions

### TypeScript
- Strict mode enabled (`strict: true`)
- No unused locals or parameters
- Explicit imports (no namespace imports)

### File Naming
- Components: PascalCase (`MyPlugin.tsx`)
- Utilities: camelCase (`myUtility.ts`)
- Tests: `*.test.{ts,tsx}`

### Plugin File Structure

```typescript
// src/components/editor/lexical/plugins/MyPlugin.tsx

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import { logger } from '../../../utils/logger'

/**
 * MyPlugin — Brief description
 *
 * Features:
 * - Feature 1
 * - Feature 2
 */
export function MyPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Plugin setup
  }, [editor])

  return null
}
```

### Logging

Use the centralized logger:

```typescript
import { logger } from '../../../utils/logger'

logger.info({ action: 'myAction', data }, 'Message')
logger.debug({ state }, 'Detailed trace')
logger.error({ error }, 'Error occurred')
```

See [docs/LOGGING.md](docs/LOGGING.md) for full logging setup.

## Submitting Changes

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/my-plugin
   ```

2. **Write tests** for your plugin (at least 70% coverage):
   ```bash
   npm test
   ```

3. **Update documentation** in `docs/` directory

4. **Create a pull request** with:
   - **Title:** `feat: add MyPlugin` or `fix: improve MyPlugin`
   - **Description:** What does it do? Why? Any breaking changes?
   - **Testing:** How to verify it works?
   - **Related issue:** Link to the GitHub issue

5. **Wait for review** — maintainers will check code quality, tests, and alignment with roadmap

## Before You Start

**Please open an issue first** if you plan to:
- Add a major new feature
- Change architecture or data structures
- Refactor existing plugins
- Add new dependencies

This helps coordinate work and ensures alignment with the project vision.

## Questions?

- **Lexical API questions** → [Lexical documentation](https://lexical.dev/)
- **Project architecture** → See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Plugin examples** → Check existing plugins in `src/components/editor/lexical/plugins/`
- **GitHub issues** → Open an issue to ask questions or request features

## License

By contributing, you agree that your contributions are licensed under the same license as the project (check `LICENSE` file).

---

**Happy contributing! 🎉**

We're building the world's most powerful writing tool for storytellers. Your plugins help make that vision real.
