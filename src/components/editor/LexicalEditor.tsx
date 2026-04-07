import React, { useEffect, useState } from 'react';
import './lexical/style.css';
import './lexical/nodes/SceneBreakNode.css';
import './lexical/nodes/EntityMentionNode.css';
import './lexical/nodes/AnnotationNode.css';

import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import { countWordsFromLexical } from '@/utils/wordCount';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ImageNode } from './lexical/nodes/ImageNode';
import { SceneBreakNode } from './lexical/nodes/SceneBreakNode';
import { EntityMentionNode } from './lexical/nodes/EntityMentionNode';
import { AnnotationNode } from './lexical/nodes/AnnotationNode';

import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';

import AutoLinkPlugin from './lexical/plugins/AutoLinkPlugin';
import TreeViewPlugin from './lexical/plugins/TreeViewPlugin';
import DragDropBlockPlugin from './lexical/plugins/DragDropBlockPlugin';
import ImagePlugin from './lexical/plugins/ImagePlugin';
import ImageResizePlugin from './lexical/plugins/ImageResizePlugin';
import SlashCommandPlugin from './lexical/plugins/SlashCommandPlugin';
import SceneBreakPlugin from './lexical/plugins/SceneBreakPlugin';
import EntityMentionPlugin from './lexical/plugins/EntityMentionPlugin';
import { AnnotationPlugin } from './lexical/plugins/AnnotationPlugin';
import FindReplacePlugin from './lexical/plugins/FindReplacePlugin';
import FormattingToolbar from './FormattingToolbar';

import PlaygroundEditorTheme from './lexical/themes/PlaygroundEditorTheme';

interface LexicalEditorProps {
  chapterId: string;
  initialContent?: string;
  language?: string;
  onContentChange?: (serialisedState: string, wordCount: number) => void;
  showDragMenu?: boolean;
  enableTreeViewPlugin?: boolean;
  onAnnotationsChange?: (annotations: any[]) => void;
}

const LexicalEditor: React.FC<LexicalEditorProps> = ({
  chapterId,
  initialContent,
  language = 'en',
  onContentChange,
  showDragMenu = true,
  enableTreeViewPlugin = false,
  onAnnotationsChange,
}) => {
  const [wordCount, setWordCount] = useState<number>(0);
  const theme = PlaygroundEditorTheme;

  function handleChange(editorState: EditorState) {
    const serialisedState = JSON.stringify(editorState.toJSON());
    console.log(
      `[LEXICAL] onChange callback fired: ${serialisedState.length} bytes`
    );
    console.log(`[LEXICAL] State: ${serialisedState.substring(0, 100)}`);
    if (onContentChange) {
      // Calculate word count using improved counter that handles lists and line breaks
      const count = countWordsFromLexical(serialisedState);
      console.log(`[LEXICAL] Calling onContentChange with word count: ${count}`);
      onContentChange(serialisedState, count);
    }
  }

  function WordCountPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
      return editor.registerTextContentListener((textContent) => {
        // Count words - use simple split fallback
        const wordCount = textContent.split(/\s+/).filter(Boolean).length;
        setWordCount(wordCount);
      });
    }, [editor, language]);

    return null;
  }


  function Placeholder() {
    return <div className="editor-placeholder">Start writing, or type / to insert a block...</div>;
  }

  function onError(error: any) {
    console.error(error);
  }

  let initialEditorState: string | undefined = undefined;
  if (initialContent) {
    try {
      const parsed = JSON.parse(initialContent);
      initialEditorState = JSON.stringify(parsed);
      console.log(`[LEXICAL] Parsed initialContent: ${initialContent.length} bytes → ${initialEditorState.length} bytes`);
    } catch (error) {
      console.error(`[LEXICAL] Failed to parse initialContent:`, error);
    }
  } else {
    console.log(`[LEXICAL] No initialContent provided`);
  }

  return (
    <LexicalComposer
      initialConfig={{
        namespace: chapterId,
        editorState: initialEditorState,
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
        theme,
        onError,
      }}
    >
      <FormattingToolbar />
      <div className="editor-container" style={{ position: 'relative' }}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<Placeholder />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange={true} />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <AutoLinkPlugin />
        {/* LinkClickPlugin disabled - causes "Unable to find active editor" errors during save */}
        {/* <LinkClickPlugin /> */}
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <HorizontalRulePlugin />
        <TablePlugin hasCellMerge={true} hasCellBackgroundColor={false} />
        {enableTreeViewPlugin && <TreeViewPlugin />}
        <DragDropBlockPlugin showDragMenu={showDragMenu} />
        <ImageResizePlugin />
        <ImagePlugin />
        <SceneBreakPlugin />
        <EntityMentionPlugin />
        <AnnotationPlugin documentId={chapterId} onAnnotationsChange={onAnnotationsChange} />
        <SlashCommandPlugin />
        <FindReplacePlugin />
      </div>
      <WordCountPlugin />
    </LexicalComposer>
  );
};

export default LexicalEditor;
