export interface DocumentHead {
  id: string
  name: string
  cid: string
  createdAt: string
  updatedAt: string
}

export interface ResolvedDocument extends DocumentHead {
  content: string
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Not found')
    }
    throw new Error(`API error: ${response.status}`)
  }

  if (response.status === 204) {
    return null as unknown as T
  }

  return response.json()
}

export async function listDocuments(): Promise<DocumentHead[]> {
  const response = await fetch(`${API_BASE}/documents`)
  return handleResponse<DocumentHead[]>(response)
}

export async function getDocument(id: string): Promise<ResolvedDocument> {
  const response = await fetch(`${API_BASE}/documents/${id}`)
  return handleResponse<ResolvedDocument>(response)
}

export async function createDocument(name: string, content: string): Promise<DocumentHead> {
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content })
  })
  return handleResponse<DocumentHead>(response)
}

export async function updateDocument(id: string, content: string, name?: string): Promise<DocumentHead> {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, name })
  })
  return handleResponse<DocumentHead>(response)
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE'
  })
  await handleResponse<void>(response)
}
