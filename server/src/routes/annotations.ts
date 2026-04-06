import { FastifyPluginAsync } from 'fastify'
import { AnnotationCategory } from '../annotation-store.js'

interface CreateAnnotationRequest {
  documentId: string
  markId: string
  category: AnnotationCategory
  comment?: string
  blockKey?: string
  focusBlockKey?: string
}

interface UpdateAnnotationRequest {
  comment?: string
  category?: AnnotationCategory
}

const annotationsRoute: FastifyPluginAsync = async (fastify) => {
  // List annotations
  fastify.get('/annotations', async (request, reply) => {
    const { documentId } = request.query as { documentId?: string }

    if (!documentId) {
      return reply.status(400).send({ error: 'documentId query parameter is required' })
    }

    const annotations = fastify.annotationStore.list(documentId)
    return { data: annotations }
  })

  // Create annotation
  fastify.post<{ Body: CreateAnnotationRequest }>('/annotations', async (request, reply) => {
    const { documentId, markId, category, comment } = request.body

    if (!documentId || !markId || !category) {
      return reply.status(400).send({
        error: 'documentId, markId, and category are required',
      })
    }

    if (!['draft-note', 'needs-revision', 'author-note'].includes(category)) {
      return reply.status(400).send({
        error: 'category must be one of: draft-note, needs-revision, author-note',
      })
    }

    try {
      const { blockKey, focusBlockKey } = request.body
      const annotation = fastify.annotationStore.create(documentId, markId, category, comment, blockKey, focusBlockKey)
      return reply.status(201).send({ data: annotation })
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to create annotation' })
    }
  })

  // Update annotation
  fastify.patch<{ Params: { markId: string }; Body: UpdateAnnotationRequest }>(
    '/annotations/:markId',
    async (request, reply) => {
      const { markId } = request.params
      const patch = request.body

      try {
        const annotation = fastify.annotationStore.update(markId, patch)
        return { data: annotation }
      } catch (error) {
        return reply.status(404).send({ error: 'Annotation not found' })
      }
    }
  )

  // Delete annotation
  fastify.delete<{ Params: { markId: string } }>('/annotations/:markId', async (request, reply) => {
    const { markId } = request.params

    try {
      fastify.annotationStore.delete(markId)
      return reply.status(204).send()
    } catch (error) {
      return reply.status(404).send({ error: 'Annotation not found' })
    }
  })

  // Bulk delete by document
  fastify.delete('/annotations', async (request, reply) => {
    const { documentId } = request.query as { documentId?: string }

    if (!documentId) {
      return reply.status(400).send({ error: 'documentId query parameter is required' })
    }

    try {
      const deleted = fastify.annotationStore.deleteByDocument(documentId)
      return reply.status(204).send()
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to delete annotations' })
    }
  })
}

export default annotationsRoute
