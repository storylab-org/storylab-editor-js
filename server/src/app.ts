import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import cors from '@fastify/cors'
import { FastifyPluginAsync, FastifyServerOptions, FastifyError } from 'fastify'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {

}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Enable CORS for all origins (development)
  await fastify.register(cors, {
    origin: true
  })

  // Error handler for body-too-large and other errors
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const maxImageSizeMb = parseInt(process.env.MAX_IMAGE_SIZE_MB || '50', 10)

    // Check for body-too-large errors (from Fastify or custom parser)
    const isBodyTooLarge = ('code' in error && error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') ||
                          error.message.includes('size exceeds')

    if (isBodyTooLarge) {
      return reply.status(413).send({
        error: 'File too large',
        message: `Maximum image size is ${maxImageSizeMb}MB. Please compress or resize your image.`,
        maxSizeBytes: maxImageSizeMb * 1024 * 1024,
        maxSizeMB: maxImageSizeMb,
      })
    }

    // Default error handling
    reply.send(error)
  })

  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  })
}

export default app
export { app, options }
