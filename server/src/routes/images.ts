import { FastifyPluginAsync } from 'fastify'

// File size limit: default 50MB, configurable via environment variable
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE_MB || '50', 10) * 1024 * 1024

const imagesRoute: FastifyPluginAsync = async (fastify) => {
  // Register content-type parser for image/* MIME types with size limit
  fastify.addContentTypeParser(
    /^image\//,
    { parseAs: 'buffer' },
    (req, body, done) => {
      // Check size at parser level
      if (body.length > MAX_IMAGE_SIZE) {
        return done(new Error(`Image file size exceeds maximum of ${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)}MB`))
      }
      done(null, body)
    }
  )

  // POST /images - Upload an image
  fastify.post<{ Body: Buffer }>('/images', async (request, reply) => {
    const contentType = request.headers['content-type']
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

    if (!contentType || !validMimeTypes.includes(contentType)) {
      return reply.status(400).send({
        error: 'Invalid or missing Content-Type',
        message: 'Supported formats: PNG, JPEG, GIF, WebP',
        supportedTypes: validMimeTypes,
      })
    }

    const cid = await fastify.imageStore.put(new Uint8Array(request.body), contentType)
    return reply.status(201).send({ cid })
  })

  // GET /images/:cid - Retrieve an image by CID
  fastify.get<{ Params: { cid: string } }>('/images/:cid', async (request, reply) => {
    const { cid } = request.params

    // Validate CID format (64 hex characters)
    if (!/^[0-9a-f]{64}$/.test(cid)) {
      return reply.status(400).send({ error: 'Invalid CID format' })
    }

    const exists = await fastify.imageStore.has(cid)
    if (!exists) {
      return reply.status(404).send({ error: 'Image not found' })
    }

    const metadata = await fastify.imageStore.getMeta(cid)
    const data = await fastify.imageStore.getData(cid)

    reply.type(metadata.mimeType)
    return reply.send(data)
  })
}

export default imagesRoute
