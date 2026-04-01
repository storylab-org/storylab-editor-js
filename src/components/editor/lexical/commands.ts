import {LexicalCommand, createCommand} from "lexical";

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

export const INSERT_NOTE_CARD_COMMAND: LexicalCommand<InsertNoteCardPayload> = createCommand('INSERT_NOTE_CARD_COMMAND');
