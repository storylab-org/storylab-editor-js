import {LexicalCommand, createCommand} from "lexical";
import { AnnotationCategory } from '@/api/annotations'

export const CAN_PUSH_COMMAND: LexicalCommand<boolean> = createCommand();
export const CAN_DOWNLOAD_COMMAND: LexicalCommand<boolean> = createCommand();
export const DOWNLOAD_COMMAND = createCommand();

export interface InsertImagePayload {
  cid: string
  alt: string
  mimeType: string
}

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand('INSERT_IMAGE_COMMAND');

export interface InsertChapterCardPayload {
  chapterId: string | null
  chapterName: string
  style?: 'default' | 'draft' | 'revision' | 'final'
}

export const INSERT_CHAPTER_CARD_COMMAND: LexicalCommand<InsertChapterCardPayload> = createCommand('INSERT_CHAPTER_CARD_COMMAND');

export interface InsertNoteCardPayload {
  color?: string
}

export const INSERT_NOTE_CARD_COMMAND: LexicalCommand<InsertNoteCardPayload> = createCommand('INSERT_NOTE_CARD_COMMAND')

export const INSERT_SCENE_BREAK_COMMAND: LexicalCommand<void> = createCommand('INSERT_SCENE_BREAK_COMMAND')

export interface InsertEntityMentionPayload {
  entityId: string
  entityType: 'character' | 'location' | 'item'
  entityName: string
}

export const INSERT_ENTITY_MENTION_COMMAND: LexicalCommand<InsertEntityMentionPayload> = createCommand('INSERT_ENTITY_MENTION_COMMAND');

export interface AddAnnotationPayload {
  category: AnnotationCategory
}

export const ADD_ANNOTATION_COMMAND: LexicalCommand<AddAnnotationPayload> = createCommand('ADD_ANNOTATION_COMMAND')

export interface RemoveAnnotationPayload {
  markId: string
}

export const REMOVE_ANNOTATION_COMMAND: LexicalCommand<RemoveAnnotationPayload> = createCommand('REMOVE_ANNOTATION_COMMAND')

export interface ScrollToAnnotationPayload {
  markId: string
}

export const SCROLL_TO_ANNOTATION_COMMAND: LexicalCommand<ScrollToAnnotationPayload> = createCommand('SCROLL_TO_ANNOTATION_COMMAND')
