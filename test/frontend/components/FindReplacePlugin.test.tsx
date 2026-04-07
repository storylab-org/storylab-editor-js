import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $insertNodes,
} from 'lexical'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'

import FindReplacePlugin, { FindReplaceContext } from '../../../src/components/editor/lexical/plugins/FindReplacePlugin'
import FindReplaceBar from '../../../src/components/editor/FindReplaceBar'
import { useFindReplaceState } from '../../../src/components/editor/lexical/plugins/FindReplacePlugin/useFindReplaceState'
import { ImageNode } from '../../../src/components/editor/lexical/nodes/ImageNode'
import { SceneBreakNode } from '../../../src/components/editor/lexical/nodes/SceneBreakNode'
import { EntityMentionNode } from '../../../src/components/editor/lexical/nodes/EntityMentionNode'
import { AnnotationNode } from '../../../src/components/editor/lexical/nodes/AnnotationNode'
import PlaygroundEditorTheme from '../../../src/components/editor/lexical/themes/PlaygroundEditorTheme'

/**
 * Helper plugin to pre-populate editor content
 */
function ContentInjector({ text }: { text: string }) {
  const [editor] = useLexicalComposerContext()

  // Inject content once on mount
  React.useEffect(() => {
    editor.update(() => {
      const root = $getRoot()
      const paragraph = $createParagraphNode()
      const textNode = $createTextNode(text)
      paragraph.append(textNode)
      root.append(paragraph)
    })
  }, [editor, text])

  return null
}

function FindReplaceProvider({ children }: { children: React.ReactNode }) {
  const contextValue = useFindReplaceState()
  return (
    <FindReplaceContext.Provider value={contextValue}>
      {children}
    </FindReplaceContext.Provider>
  )
}

function renderEditorWithContent(text: string) {
  return render(
    <LexicalComposer
      initialConfig={{
        namespace: 'test-find-replace',
        nodes: [
          HeadingNode,
          ListNode,
          ListItemNode,
          QuoteNode,
          CodeNode,
          CodeHighlightNode,
          TableNode,
          TableCellNode,
          TableRowNode,
          AutoLinkNode,
          LinkNode,
          HorizontalRuleNode,
          ImageNode,
          SceneBreakNode,
          EntityMentionNode,
          AnnotationNode,
        ],
        theme: PlaygroundEditorTheme,
        onError: () => {},
      }}
    >
      <FindReplacePlugin />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <TablePlugin hasCellMerge={true} hasCellBackgroundColor={false} />
      <ContentInjector text={text} />
      <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={<div>Type...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <FindReplaceProvider>
          <FindReplaceBar />
        </FindReplaceProvider>
      </div>
    </LexicalComposer>
  )
}

describe('FindReplacePlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('panel open/close', () => {
    it('should not render the panel initially', () => {
      renderEditorWithContent('Hello world')
      // Panel should not exist initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should open panel on Cmd+F', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should open panel on Ctrl+F', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', ctrlKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should close panel on Escape when open', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should close panel when X button is clicked', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const closeButton = screen.getByLabelText('Close find and replace')
      fireEvent.click(closeButton)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('find — empty query', () => {
    it('should display "No results" with empty search query', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      // The match count should show "No results" when search is empty
      expect(screen.getByText('No results')).toBeInTheDocument()
    })
  })

  describe('find — matching queries', () => {
    it('should display "No results" when query has no matches', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'xyz' } })
      await waitFor(() => {
        expect(screen.getByText('No results')).toBeInTheDocument()
      })
    })

    it('should display "1 of 1" for a single match', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'world' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 1')).toBeInTheDocument()
      })
    })

    it('should display "1 of 3" for multiple matches', async () => {
      renderEditorWithContent('apple banana apple apple')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'apple' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 3')).toBeInTheDocument()
      })
    })

    it('should be case-insensitive by default', async () => {
      renderEditorWithContent('Hello HELLO hello')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'hello' } })
      await waitFor(() => {
        // Should find all three variants (case-insensitive)
        expect(screen.getByText('1 of 3')).toBeInTheDocument()
      })
    })

    it('should match exact case when case-sensitive toggle is on', async () => {
      renderEditorWithContent('Hello HELLO hello')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      // Toggle case-sensitive
      const caseButton = screen.getByRole('button', { name: 'Aa' })
      fireEvent.click(caseButton)

      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'hello' } })
      await waitFor(() => {
        // Should only find the lowercase "hello" (case-sensitive)
        expect(screen.getByText('1 of 1')).toBeInTheDocument()
      })
    })
  })

  describe('navigation', () => {
    it('should advance to next match on Next button click', async () => {
      renderEditorWithContent('apple banana apple')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'apple' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })

      const forwardButton = screen.getByLabelText('Next match')
      fireEvent.click(forwardButton)
      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument()
      })
    })

    it('should go to previous match on backward button click', async () => {
      renderEditorWithContent('apple banana apple')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'apple' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })

      // Go to next first
      let nextButton = screen.getByLabelText('Next match')
      fireEvent.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument()
      })

      // Then go to previous
      const backwardButton = screen.getByLabelText('Previous match')
      fireEvent.click(backwardButton)
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })
    })

    it('should wrap from last match back to first on Next', async () => {
      renderEditorWithContent('apple banana apple')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'apple' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })

      // Go to second match
      let nextButton = screen.getByLabelText('Next match')
      fireEvent.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument()
      })

      // Go next again (should wrap to first)
      fireEvent.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })
    })

    it('should wrap from first match to last on Prev', async () => {
      renderEditorWithContent('apple banana apple')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'apple' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })

      // Go prev on first match (should wrap to last)
      const prevButton = screen.getByLabelText('Previous match')
      fireEvent.click(prevButton)
      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument()
      })
    })

    it('should advance to next match on Enter key in search input', async () => {
      renderEditorWithContent('apple banana apple')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'apple' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })

      fireEvent.keyDown(searchInput, { key: 'Enter' })
      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument()
      })
    })

    it('should go to previous match on Shift+Enter in search input', async () => {
      renderEditorWithContent('apple banana apple')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'apple' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })

      // Go to next first
      fireEvent.keyDown(searchInput, { key: 'Enter' })
      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument()
      })

      // Then go to previous with Shift+Enter
      fireEvent.keyDown(searchInput, { key: 'Enter', shiftKey: true })
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument()
      })
    })
  })

  describe('replace', () => {
    it('should disable Replace button when no matches', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const replaceButton = screen.getByRole('button', { name: 'Replace' })
      expect(replaceButton).toBeDisabled()
    })

    it('should enable Replace button when matches exist', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'Hello' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 1')).toBeInTheDocument()
      })
      const replaceButton = screen.getByRole('button', { name: 'Replace' })
      expect(replaceButton).not.toBeDisabled()
    })

    it('should disable Replace All button when no matches', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const replaceAllButton = screen.getByRole('button', { name: 'Replace All' })
      expect(replaceAllButton).toBeDisabled()
    })

    it('should enable Replace All button when matches exist', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'Hello' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 1')).toBeInTheDocument()
      })
      const replaceAllButton = screen.getByRole('button', { name: 'Replace All' })
      expect(replaceAllButton).not.toBeDisabled()
    })
  })

  describe('panel state', () => {
    it('should clear matches when panel is closed', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const searchInput = screen.getByLabelText('Find text')
      fireEvent.change(searchInput, { target: { value: 'Hello' } })
      await waitFor(() => {
        expect(screen.getByText('1 of 1')).toBeInTheDocument()
      })

      // Close panel
      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // Re-open panel — search should be cleared
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      // After re-opening with cleared state, should show "No results"
      expect(screen.getByText('No results')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByLabelText('Find text')).toBeInTheDocument()
      expect(screen.getByLabelText('Replace with text')).toBeInTheDocument()
      expect(screen.getByLabelText('Previous match')).toBeInTheDocument()
      expect(screen.getByLabelText('Next match')).toBeInTheDocument()
    })

    it('should have aria-pressed on case toggle button', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const caseButton = screen.getByRole('button', { name: 'Aa' })
      expect(caseButton).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(caseButton)
      expect(caseButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have aria-live on match count', async () => {
      renderEditorWithContent('Hello world')
      fireEvent.keyDown(document, { key: 'f', metaKey: true })
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const matchCount = screen.getByText('No results')
      expect(matchCount).toHaveAttribute('aria-live', 'polite')
    })
  })
})
