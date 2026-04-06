import fs from 'fs'
import path from 'path'
import os from 'os'

export type AnnotationCategory = 'draft-note' | 'needs-revision' | 'author-note'

export interface Annotation {
  markId: string
  documentId: string
  category: AnnotationCategory
  comment?: string
  blockKey?: string
  focusBlockKey?: string
  createdAt: string
  updatedAt: string
}

const ANNOTATIONS_FILE = path.join(os.homedir(), '.storylab', 'annotations.json')

export class AnnotationStore {
  private annotations = new Map<string, Annotation>()

  constructor() {
    this.load()
  }

  private load() {
    try {
      if (fs.existsSync(ANNOTATIONS_FILE)) {
        const data = fs.readFileSync(ANNOTATIONS_FILE, 'utf-8')
        const parsed = JSON.parse(data) as Annotation[]
        this.annotations.clear()
        parsed.forEach((ann) => {
          this.annotations.set(ann.markId, ann)
        })
      }
    } catch (error) {
      console.error('Failed to load annotations:', error)
      this.annotations.clear()
    }
  }

  private save() {
    try {
      const dir = path.dirname(ANNOTATIONS_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const data = Array.from(this.annotations.values())
      fs.writeFileSync(ANNOTATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save annotations:', error)
    }
  }

  list(documentId?: string): Annotation[] {
    if (documentId) {
      return Array.from(this.annotations.values()).filter((a) => a.documentId === documentId)
    }
    return Array.from(this.annotations.values())
  }

  get(markId: string): Annotation | undefined {
    return this.annotations.get(markId)
  }

  create(documentId: string, markId: string, category: AnnotationCategory, comment?: string, blockKey?: string, focusBlockKey?: string): Annotation {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      markId,
      documentId,
      category,
      comment,
      blockKey,
      focusBlockKey,
      createdAt: now,
      updatedAt: now,
    }
    this.annotations.set(markId, annotation)
    this.save()
    return annotation
  }

  update(markId: string, patch: Partial<Omit<Annotation, 'markId' | 'documentId' | 'createdAt'>>): Annotation {
    const existing = this.annotations.get(markId)
    if (!existing) {
      throw new Error(`Annotation not found: ${markId}`)
    }
    const updated: Annotation = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    this.annotations.set(markId, updated)
    this.save()
    return updated
  }

  delete(markId: string): void {
    if (!this.annotations.has(markId)) {
      throw new Error(`Annotation not found: ${markId}`)
    }
    this.annotations.delete(markId)
    this.save()
  }

  deleteByDocument(documentId: string): number {
    const before = this.annotations.size
    const toDelete = Array.from(this.annotations.values())
      .filter((a) => a.documentId === documentId)
      .map((a) => a.markId)
    toDelete.forEach((markId) => this.annotations.delete(markId))
    const after = this.annotations.size
    if (before !== after) {
      this.save()
    }
    return before - after
  }
}

export const annotationStore = new AnnotationStore()
