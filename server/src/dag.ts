/**
 * CAR (Content Addressable aRchive) manifest structure for full-state backup.
 * Version 2 uses IPFS CIDv1 (base32 multibase) for all block references.
 *
 * The manifest itself is stored as the first block in the CAR;
 * its CIDv1 becomes the root identifier and the export filename.
 */

export interface ChapterRef {
  id: string // document UUID
  name: string
  cid: string // CIDv1 base32 string of content block (in CAR)
  order: number
  createdAt: string
  updatedAt: string
}

export interface Manifest {
  version: '2' // CAR v2 format with CIDv1
  title: string
  chapters: ChapterRef[]
  entitiesCid: string // CIDv1 base32
  annotationsCid: string
  overviewCid: string
  boardCid: string
  pathsCid: string
  images: Array<{ cid: string; mimeType: string }> // cid = CIDv1 base32
  createdAt: string
}
