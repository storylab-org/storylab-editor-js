import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { annotationStore, AnnotationStore } from '../annotation-store.js'

declare module 'fastify' {
  interface FastifyInstance {
    annotationStore: AnnotationStore
  }
}

const annotationStorePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('annotationStore', annotationStore)
}

export default fp(annotationStorePlugin)
