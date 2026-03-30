import { test } from 'node:test'
import assert from 'node:assert'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { buildApp } from '../helper.ts'

// Helper to create a minimal valid PNG header (4 bytes)
function createMinimalPngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47])
}

test('images: POST /images with valid PNG bytes returns 201 and CID', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()
    const pngBytes = createMinimalPngBuffer()

    const response = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'image/png' },
      payload: pngBytes
    })

    assert.strictEqual(response.statusCode, 201)
    const data = JSON.parse(response.body)
    assert(data.cid)
    assert.strictEqual(data.cid.length, 64)
    assert(/^[0-9a-f]{64}$/.test(data.cid))
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: POST /images returns same CID for identical bytes (idempotent)', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()
    const pngBytes = createMinimalPngBuffer()

    const response1 = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'image/png' },
      payload: pngBytes
    })
    const cid1 = JSON.parse(response1.body).cid

    const response2 = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'image/png' },
      payload: pngBytes
    })
    const cid2 = JSON.parse(response2.body).cid

    assert.strictEqual(cid1, cid2)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: POST /images with unsupported content type returns 415', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'application/pdf' },
      payload: Buffer.from('fake pdf')
    })

    assert.strictEqual(response.statusCode, 415)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: POST /images with no content type returns 400', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/images',
      payload: Buffer.from('no content type')
    })

    assert(response.statusCode === 400 || response.statusCode === 415)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: GET /images/:cid returns bytes with correct Content-Type', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()
    const pngBytes = createMinimalPngBuffer()

    // Upload image
    const uploadResponse = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'image/png' },
      payload: pngBytes
    })
    const { cid } = JSON.parse(uploadResponse.body)

    // Retrieve image
    const downloadResponse = await app.inject({
      method: 'GET',
      url: `/images/${cid}`
    })

    assert.strictEqual(downloadResponse.statusCode, 200)
    assert.strictEqual(downloadResponse.headers['content-type'], 'image/png')
    assert.strictEqual(downloadResponse.rawPayload.length, pngBytes.length)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: GET /images/:cid returns 404 for unknown CID', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()
    const unknownCid = '0000000000000000000000000000000000000000000000000000000000000000'

    const response = await app.inject({
      method: 'GET',
      url: `/images/${unknownCid}`
    })

    assert.strictEqual(response.statusCode, 404)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: GET /images/:cid returns 400 for malformed CID', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/images/not-a-valid-cid'
    })

    assert.strictEqual(response.statusCode, 400)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: Round-trip upload and retrieve returns identical bytes', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()
    const originalBytes = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])

    // Upload image
    const uploadResponse = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'image/jpeg' },
      payload: originalBytes
    })
    const { cid } = JSON.parse(uploadResponse.body)

    // Retrieve image
    const downloadResponse = await app.inject({
      method: 'GET',
      url: `/images/${cid}`
    })

    assert.strictEqual(downloadResponse.statusCode, 200)
    assert.deepStrictEqual(downloadResponse.rawPayload, originalBytes)
    assert.strictEqual(downloadResponse.headers['content-type'], 'image/jpeg')
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('images: POST /images with file exceeding size limit returns 413', async () => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'images-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  // Set size limit to 1MB for testing
  process.env.MAX_IMAGE_SIZE_MB = '1'

  try {
    const app = await buildApp()
    // Create a file larger than 1MB (2MB)
    const largeBuffer = Buffer.alloc(2 * 1024 * 1024, 0xff)

    const response = await app.inject({
      method: 'POST',
      url: '/images',
      headers: { 'content-type': 'image/png' },
      payload: largeBuffer
    })

    assert.strictEqual(response.statusCode, 413)
    const data = JSON.parse(response.body)
    assert(data.error || data.message, `Expected error response, got: ${response.body}`)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    delete process.env.MAX_IMAGE_SIZE_MB
    rmSync(tmpdir, { recursive: true })
  }
})
