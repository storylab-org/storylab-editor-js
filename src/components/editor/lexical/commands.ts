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
