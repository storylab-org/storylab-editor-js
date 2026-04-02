import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { createOverviewStore, OverviewStore } from '../overview-store.js'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const overviewStorePlugin: FastifyPluginAsync = async (fastify) => {
  const dataDir = process.env.STORYLAB_DATA_DIR ?? join(homedir(), '.storylab')

  // Ensure directory exists
  await mkdir(dataDir, { recursive: true })

  const overviewStore = createOverviewStore(dataDir)
  fastify.decorate('overviewStore', overviewStore)

  fastify.log.info({ dataDir }, 'overview store plugin initialised')
}

export default fp(overviewStorePlugin)

declare module 'fastify' {
  interface FastifyInstance {
    overviewStore: OverviewStore
  }
}
