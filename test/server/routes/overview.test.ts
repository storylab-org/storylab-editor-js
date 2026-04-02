import { test } from 'node:test'
import assert from 'node:assert'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { buildApp } from '../helper.ts'

test('overview: GET /overview returns empty content when file does not exist', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/overview'
    })

    assert.strictEqual(response.statusCode, 200)
    const data = JSON.parse(response.body)
    assert.strictEqual(data.content, '')
    assert(data.updatedAt)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: PUT /overview saves content', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'PUT',
      url: '/overview',
      payload: { content: 'World building notes...' }
    })

    assert.strictEqual(response.statusCode, 200)
    const data = JSON.parse(response.body)
    assert.strictEqual(data.content, 'World building notes...')
    assert(data.updatedAt)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: GET /overview after PUT returns saved content', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    // Save content
    await app.inject({
      method: 'PUT',
      url: '/overview',
      payload: { content: 'Saved notes' }
    })

    // Retrieve content
    const response = await app.inject({
      method: 'GET',
      url: '/overview'
    })

    assert.strictEqual(response.statusCode, 200)
    const data = JSON.parse(response.body)
    assert.strictEqual(data.content, 'Saved notes')
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: GET /paths returns empty array when no paths exist', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/paths'
    })

    assert.strictEqual(response.statusCode, 200)
    const data = JSON.parse(response.body)
    assert(Array.isArray(data))
    assert.strictEqual(data.length, 0)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: POST /paths creates story path', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/paths',
      payload: {
        fromCardId: 'ch1',
        toCardId: 'ch2',
        label: 'If players go left'
      }
    })

    assert.strictEqual(response.statusCode, 201)
    const data = JSON.parse(response.body)
    assert(data.id)
    assert.strictEqual(data.fromCardId, 'ch1')
    assert.strictEqual(data.toCardId, 'ch2')
    assert.strictEqual(data.label, 'If players go left')
    assert(data.createdAt)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: POST /paths without label works', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/paths',
      payload: {
        fromCardId: 'ch1',
        toCardId: 'ch2'
      }
    })

    assert.strictEqual(response.statusCode, 201)
    const data = JSON.parse(response.body)
    assert(data.id)
    assert.strictEqual(data.fromCardId, 'ch1')
    assert.strictEqual(data.toCardId, 'ch2')
    assert(!data.label || data.label === undefined)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: POST /paths validates fromCardId', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/paths',
      payload: {
        toCardId: 'ch2'
      }
    })

    assert.strictEqual(response.statusCode, 400)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: POST /paths validates toCardId', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/paths',
      payload: {
        fromCardId: 'ch1'
      }
    })

    assert.strictEqual(response.statusCode, 400)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: DELETE /paths/:id removes path', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    // Create a path
    const createResponse = await app.inject({
      method: 'POST',
      url: '/paths',
      payload: {
        fromCardId: 'ch1',
        toCardId: 'ch2'
      }
    })

    const path = JSON.parse(createResponse.body)

    // Delete the path
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/paths/${path.id}`
    })

    assert.strictEqual(deleteResponse.statusCode, 204)

    // Verify it's deleted
    const listResponse = await app.inject({
      method: 'GET',
      url: '/paths'
    })

    const paths = JSON.parse(listResponse.body)
    assert.strictEqual(paths.length, 0)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: DELETE /paths/:id returns 404 for unknown path', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    const response = await app.inject({
      method: 'DELETE',
      url: '/paths/unknown-id'
    })

    assert.strictEqual(response.statusCode, 404)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('overview: GET /paths reflects created paths', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'overview-'))
  process.env.STORYLAB_DATA_DIR = tmpdir

  try {
    const app = await buildApp()

    // Create two paths
    await app.inject({
      method: 'POST',
      url: '/paths',
      payload: { fromCardId: 'ch1', toCardId: 'ch2' }
    })

    await app.inject({
      method: 'POST',
      url: '/paths',
      payload: { fromCardId: 'ch2', toCardId: 'ch3' }
    })

    // List paths
    const response = await app.inject({
      method: 'GET',
      url: '/paths'
    })

    assert.strictEqual(response.statusCode, 200)
    const paths = JSON.parse(response.body)
    assert.strictEqual(paths.length, 2)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})
