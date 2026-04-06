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

const API_BASE = 'http://localhost:3000'

export async function listAnnotations(documentId: string): Promise<Annotation[]> {
  const response = await fetch(`${API_BASE}/annotations?documentId=${encodeURIComponent(documentId)}`)
  if (!response.ok) {
    throw new Error(`Failed to list annotations: ${response.statusText}`)
  }
  const json = await response.json()
  return json.data
}

export async function createAnnotation(
  documentId: string,
  markId: string,
  category: AnnotationCategory,
  comment?: string,
  blockKey?: string,
  focusBlockKey?: string
): Promise<Annotation> {
  const response = await fetch(`${API_BASE}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, markId, category, comment, blockKey, focusBlockKey }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create annotation: ${response.statusText}`)
  }
  const json = await response.json()
  return json.data
}

export async function updateAnnotation(
  markId: string,
  patch: { comment?: string; category?: AnnotationCategory }
): Promise<Annotation> {
  const response = await fetch(`${API_BASE}/annotations/${encodeURIComponent(markId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!response.ok) {
    throw new Error(`Failed to update annotation: ${response.statusText}`)
  }
  const json = await response.json()
  return json.data
}

export async function deleteAnnotation(markId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/annotations/${encodeURIComponent(markId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete annotation: ${response.statusText}`)
  }
}

export async function deleteAnnotationsByDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/annotations?documentId=${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete annotations: ${response.statusText}`)
  }
}
