import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { entityStore, EntityStore } from '../entity-store.js'

const entityStorePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('entityStore', entityStore)
}

export default fp(entityStorePlugin)

declare module 'fastify' {
  interface FastifyInstance {
    entityStore: EntityStore
  }
}
