import { FastifyPluginAsync } from 'fastify'
import type { Entity, EntityType } from '../entity-store'

interface GetEntitiesQuery {
  type?: 'character' | 'location' | 'item'
}

interface CreateEntityBody {
  name: string
  type: 'character' | 'location' | 'item'
  description?: string
  tags?: string[]
}

interface UpdateEntityBody {
  name?: string
  description?: string
  tags?: string[]
}

const entitiesRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: GetEntitiesQuery; Reply: Entity[] }>('/entities', async (request, reply) => {
    const { type } = request.query
    const entities = fastify.entityStore.list(type as EntityType | undefined)
    return entities
  })

  fastify.get<{ Params: { id: string }; Reply: Entity }>('/entities/:id', async (request, reply) => {
    try {
      const entity = fastify.entityStore.get(request.params.id)
      return entity
    } catch (error) {
      reply.notFound('Entity not found')
    }
  })

  fastify.post<{ Body: CreateEntityBody; Reply: Entity }>('/entities', async (request, reply) => {
    const { name, type, description, tags } = request.body as CreateEntityBody
    const entity = fastify.entityStore.create(name, type, description, tags)
    reply.code(201)
    return entity
  })

  fastify.patch<{ Params: { id: string }; Body: UpdateEntityBody; Reply: Entity }>('/entities/:id', async (request, reply) => {
    try {
      const entity = fastify.entityStore.update(request.params.id, request.body as UpdateEntityBody)
      return entity
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.notFound('Entity not found')
        return
      }
      throw error
    }
  })

  fastify.delete<{ Params: { id: string } }>('/entities/:id', async (request, reply) => {
    try {
      fastify.entityStore.delete(request.params.id)
      reply.code(204)
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.notFound('Entity not found')
        return
      }
      throw error
    }
  })
}

export default entitiesRoute
