import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastify from 'fastify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function buildApp() {
  // Read max image size from environment or use default
  const maxImageSizeMb = parseInt(process.env.MAX_IMAGE_SIZE_MB || '50', 10)
  const bodyLimit = maxImageSizeMb * 1024 * 1024

  const instance = fastify({
    bodyLimit,
    logger: false // Disable logging in tests
  })

  // Import the compiled app from dist directory
  const { default: app } = await import('../../server/dist/app.js')

  // Register the app plugin - this should load all plugins via AutoLoad
  await instance.register(app)

  // Wait a small amount for plugins to fully register
  await instance.ready()

  return instance
}
