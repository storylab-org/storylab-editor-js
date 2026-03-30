// Load environment variables from .env file FIRST, before anything else
import dotenv from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

import Fastify from 'fastify'
import app from './app.js'

async function start() {
  // Configurable max image size: default 50MB
  const maxImageSizeMb = parseInt(process.env.MAX_IMAGE_SIZE_MB || '50', 10)
  const bodyLimit = maxImageSizeMb * 1024 * 1024

  const fastify = Fastify({
    bodyLimit,
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    }
  })

  try {
    await fastify.register(app)

    const port = parseInt(process.env.PORT || '3000', 10)
    const host = process.env.HOST || '0.0.0.0'

    await fastify.listen({ port, host })
    console.log(`Server listening on http://localhost:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
