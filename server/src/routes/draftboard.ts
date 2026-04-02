import { FastifyPluginAsync } from 'fastify'

const draftboardRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/overview', async (request, reply) => {
    const data = await fastify.overviewStore.getOverview()
    reply.code(200).send(data)
  })

  fastify.put('/overview', async (request, reply) => {
    const body = request.body as { content: string }
    const data = await fastify.overviewStore.putOverview(body.content)
    reply.code(200).send(data)
  })

  fastify.get('/paths', async (request, reply) => {
    const paths = await fastify.overviewStore.listPaths()
    reply.code(200).send(paths)
  })

  fastify.get('/board', async (request, reply) => {
    const data = await fastify.overviewStore.getBoard()
    reply.code(200).send(data)
  })

  fastify.put('/board', async (request, reply) => {
    const body = request.body as { cards: any[] }
    const data = await fastify.overviewStore.putBoard(body.cards)
    reply.code(200).send(data)
  })

  fastify.post('/board/cards', async (request, reply) => {
    const body = request.body as {
      shape: string
      x: number
      y: number
      title?: string
      body?: string
      color?: string
      chapterId?: string | null
      chapterName?: string
    }

    const card = await fastify.overviewStore.addCard({
      shape: body.shape as any,
      x: body.x,
      y: body.y,
      title: body.title,
      body: body.body,
      color: body.color,
      chapterId: body.chapterId,
      chapterName: body.chapterName,
    })
    reply.code(201).send(card)
  })

  fastify.put('/board/cards/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, any>

    try {
      const card = await fastify.overviewStore.updateCard(id, body)
      reply.code(200).send(card)
    } catch (error: any) {
      if (error.statusCode === 404) {
        reply.code(404).send({ error: `Card not found: ${id}` })
      } else {
        throw error
      }
    }
  })

  fastify.patch('/board/cards/:id/position', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { x: number; y: number }

    try {
      const card = await fastify.overviewStore.updateCard(id, body)
      reply.code(200).send(card)
    } catch (error: any) {
      if (error.statusCode === 404) {
        reply.code(404).send({ error: `Card not found: ${id}` })
      } else {
        throw error
      }
    }
  })

  fastify.delete('/board/cards/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      await fastify.overviewStore.deleteCard(id)
      reply.code(204).send()
    } catch (error: any) {
      if (error.statusCode === 404) {
        reply.code(404).send({ error: `Card not found: ${id}` })
      } else {
        throw error
      }
    }
  })

  fastify.post('/paths', async (request, reply) => {
    const body = request.body as {
      fromCardId: string
      toCardId: string
      label?: string
    }

    // Validate required fields
    if (!body.fromCardId || typeof body.fromCardId !== 'string') {
      reply.code(400).send({ error: 'fromCardId is required and must be a string' })
      return
    }

    if (!body.toCardId || typeof body.toCardId !== 'string') {
      reply.code(400).send({ error: 'toCardId is required and must be a string' })
      return
    }

    const path = await fastify.overviewStore.createPath(
      body.fromCardId,
      body.toCardId,
      body.label
    )
    reply.code(201).send(path)
  })

  fastify.delete('/paths/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      await fastify.overviewStore.deletePath(id)
      reply.code(204).send()
    } catch (error: any) {
      if (error.statusCode === 404) {
        reply.code(404).send({ error: `Path not found: ${id}` })
      } else {
        throw error
      }
    }
  })
}

export default draftboardRoute
