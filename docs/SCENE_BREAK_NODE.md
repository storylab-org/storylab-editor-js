# SceneBreakNode Implementation Guide

> **Last Updated:** April 2026  
> **Status:** Ready to implement  
> **Estimated Effort:** 2–3 hours including tests

## Overview

`SceneBreakNode` is a visual scene separator within chapters. It renders as a decorative divider (`* * *` or an ornamental line) and marks a transition between scenes.

### Why Scene Breaks Matter

For DM storybooks:
- **Editorial clarity** — Visual chapter structure without chapter headers
- **Prose separation** — Clean visual break between discrete scenes
- **Export-friendly** — Converts to standard Markdown (`---`) or HTML (`<hr>`) cleanly
- **Low overhead** — Just a visual decorator, no metadata or interactivity

## Architecture

### Node Type: DecoratorNode

```typescript
class SceneBreakNode extends DecoratorNode<React.ReactElement>
```

**Why DecoratorNode?**
- Renders arbitrary React content (`* * *` or SVG)
- Non-interactive, purely visual
- Serialises trivially (no complex state)
- Plays well with undo/redo

### Data Model

```typescript
interface SerializedSceneBreakNode extends SerializedLexicalNode {
  type: 'scene-break'
  version: 1
}
```

No additional properties needed. SceneBreakNode is a pure separator with no state.

## Implementation Plan

### 1. Create `src/components/editor/lexical/nodes/SceneBreakNode.ts`

```typescript
import { DecoratorNode, SerializedLexicalNode, NodeKey, LexicalNode } from 'lexical'
import React from 'react'

interface SerializedSceneBreakNode extends SerializedLexicalNode {
  type: 'scene-break'
  version: 1
}

export class SceneBreakNode extends DecoratorNode<React.ReactElement> {
  constructor(key?: NodeKey) {
    super(key)
  }

  static getType(): string {
    return 'scene-break'
  }

  static clone(node: SceneBreakNode): SceneBreakNode {
    return new SceneBreakNode(node.__key)
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'scene-break-node'
    return div
  }

  updateDOM(): false {
    return false
  }

  isInline(): false {
    return false
  }

  decorate(): React.ReactElement {
    return <SceneBreakComponent />
  }

  exportJSON(): SerializedSceneBreakNode {
    return {
      type: 'scene-break',
      version: 1,
    }
  }

  static importJSON(serializedNode: SerializedSceneBreakNode): SceneBreakNode {
    return $createSceneBreakNode()
  }

  static importDOM(): null {
    return null
  }
}

export function $createSceneBreakNode(): SceneBreakNode {
  return new SceneBreakNode()
}

function SceneBreakComponent() {
  return (
    <div className="scene-break-container">
      <span className="scene-break-text">* * *</span>
    </div>
  )
}
```

### 2. Register Node in LexicalEditor

Update `src/components/editor/LexicalEditor.tsx`:

```typescript
import { SceneBreakNode } from './lexical/nodes/SceneBreakNode'

// In the editor config:
const nodes = [
  // ... existing nodes
  SceneBreakNode,
]
```

### 3. Add Command in `commands.ts`

```typescript
import { createCommand, LexicalCommand } from 'lexical'

export const INSERT_SCENE_BREAK_COMMAND: LexicalCommand<void> =
  createCommand()
```

### 4. Create `src/components/editor/lexical/plugins/SceneBreakPlugin.tsx`

```typescript
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_EDITOR, $getSelection, $isRangeSelection } from 'lexical'
import { useEffect } from 'react'
import { INSERT_SCENE_BREAK_COMMAND } from '../commands'
import { $createSceneBreakNode } from '../nodes/SceneBreakNode'

export default function SceneBreakPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_SCENE_BREAK_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const sceneBreak = $createSceneBreakNode()
            selection.insertNodes([sceneBreak])
          }
        })
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
```

### 5. Add Slash Command

Update `src/components/editor/lexical/plugins/SlashCommandPlugin/commands.ts`:

```typescript
import { Minus } from 'lucide-react'

export const SLASH_COMMANDS = [
  // ... existing commands
  {
    name: 'Scene Break',
    shortcut: '/break',
    icon: Minus,
    command: INSERT_SCENE_BREAK_COMMAND,
    description: 'Visual separator between scenes',
  },
]
```

### 6. Add Styling

Create `src/components/editor/lexical/nodes/SceneBreakNode.css`:

```css
.scene-break-node {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 24px 0;
  padding: 16px 0;
  cursor: default;
  user-select: none;
}

.scene-break-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.scene-break-text {
  font-size: 16px;
  color: #999;
  letter-spacing: 6px;
  font-weight: 300;
}
```

Import in `LexicalEditor.tsx`:
```typescript
import './lexical/nodes/SceneBreakNode.css'
```

### 7. Export Handling

#### Markdown Export (`server/src/lexical-to-markdown.ts`)

```typescript
case 'scene-break':
  return '---' // Standard Markdown divider
```

#### HTML Export (`server/src/lexical-to-html.ts`)

```typescript
case 'scene-break':
  return '<hr class="scene-break" style="margin: 24px 0; border: none; border-top: 1px solid #ccc;" />'
```

#### DOCX/EPUB Export

No special handling needed — treat as block element that renders with spacing.

### 8. Write Tests

Write tests in `test/frontend/components/` and `test/server/routes/` covering:
- **Node class:** instantiation, type identification, serialisation/deserialisation, cloning, inline flag
- **Plugin command:** insertion via `INSERT_SCENE_BREAK_COMMAND` adds node to tree
- **Export handlers:** Markdown export converts to `---`; HTML export converts to `<hr>`
- **End-to-end:** type `/break` in slash command, verify visual render, verify document persistence

## Checklist

- [ ] Create `SceneBreakNode.ts` with serialisation/deserialisation
- [ ] Create `SceneBreakPlugin.tsx` with command handler
- [ ] Register node in `LexicalEditor.tsx`
- [ ] Add command to `commands.ts`
- [ ] Add slash command entry with Lucide icon
- [ ] Create `SceneBreakNode.css` with styling
- [ ] Update `lexical-to-markdown.ts` for `---` conversion
- [ ] Update `lexical-to-html.ts` for `<hr>` rendering
- [ ] Write unit tests for node serialisation/cloning
- [ ] Write integration tests for plugin command dispatch
- [ ] Write export tests (Markdown, HTML, DOCX, EPUB)
- [ ] Manual smoke test: type `/break`, verify visual render
- [ ] Manual smoke test: export to Markdown, verify `---` divider
- [ ] Run full test suite: `npm test`

## Future Enhancements

- [ ] Custom SVG render (decorative line/quill/sword instead of `* * *`)
- [ ] Keyboard shortcut (e.g. `Ctrl+Shift+S`)
- [ ] Context menu option (right-click → Insert Scene Break)
- [ ] Toggle between `* * *`, `***`, `- - -`, or SVG style
- [ ] Scene break counter in sidebar ("X scenes this chapter")
- [ ] Scene break in Draft Board (visual chapter structure preview)

## References

- **Lexical DecoratorNode:** https://lexical.dev/docs/concepts/nodes#decorators
- **Custom Nodes Guide:** docs/DM_STORYBOOK.md (section: Custom Nodes)
- **Export Patterns:** server/src/lexical-to-markdown.ts, server/src/lexical-to-html.ts
