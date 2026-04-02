import { test } from 'node:test'
import * as assert from 'node:assert'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { buildApp } from '../helper.ts'

test('entities: GET /entities returns list', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'entities-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  try {
    const app = await buildApp()
    const response = await app.inject({ method: 'GET', url: '/entities' })
    assert.strictEqual(response.statusCode, 200)
    const entities = JSON.parse(response.body)
    assert.ok(Array.isArray(entities))
    assert.strictEqual(entities.length, 15) // 5 chars + 5 locations + 5 items
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('entities: GET /entities?type=character filters', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'entities-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  try {
    const app = await buildApp()
    const response = await app.inject({ method: 'GET', url: '/entities?type=character' })
    assert.strictEqual(response.statusCode, 200)
    const entities = JSON.parse(response.body)
    assert.strictEqual(entities.length, 5)
    assert.ok(entities.every((e: any) => e.type === 'character'))
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('entities: POST /entities creates entity', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'entities-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  try {
    const app = await buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/entities',
      payload: { name: 'Test Entity', type: 'character', description: 'A test' },
    })
    assert.strictEqual(response.statusCode, 201)
    const entity = JSON.parse(response.body)
    assert.strictEqual(entity.name, 'Test Entity')
    assert.strictEqual(entity.type, 'character')
    assert.ok(entity.id)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('entities: GET /entities/:id retrieves entity', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'entities-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  try {
    const app = await buildApp()
    // First get list to get an ID
    const listResponse = await app.inject({ method: 'GET', url: '/entities?type=character' })
    const entities = JSON.parse(listResponse.body)
    const entityId = entities[0].id

    // Then get that specific entity
    const response = await app.inject({ method: 'GET', url: `/entities/${entityId}` })
    assert.strictEqual(response.statusCode, 200)
    const entity = JSON.parse(response.body)
    assert.strictEqual(entity.id, entityId)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('entities: PATCH /entities/:id updates entity', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'entities-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  try {
    const app = await buildApp()
    // Get an entity to update
    const listResponse = await app.inject({ method: 'GET', url: '/entities?type=character' })
    const entities = JSON.parse(listResponse.body)
    const entityId = entities[0].id

    // Update it
    const response = await app.inject({
      method: 'PATCH',
      url: `/entities/${entityId}`,
      payload: { description: 'Updated description' },
    })
    assert.strictEqual(response.statusCode, 200)
    const entity = JSON.parse(response.body)
    assert.strictEqual(entity.description, 'Updated description')
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('entities: DELETE /entities/:id removes entity', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'entities-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  try {
    const app = await buildApp()
    // Create an entity to delete
    const createResponse = await app.inject({
      method: 'POST',
      url: '/entities',
      payload: { name: 'Temp Entity', type: 'item' },
    })
    const entity = JSON.parse(createResponse.body)

    // Delete it
    const deleteResponse = await app.inject({ method: 'DELETE', url: `/entities/${entity.id}` })
    assert.strictEqual(deleteResponse.statusCode, 204)

    // Verify it's gone
    const getResponse = await app.inject({ method: 'GET', url: `/entities/${entity.id}` })
    assert.strictEqual(getResponse.statusCode, 404)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})

test('entities: GET /entities/:id returns 404 for unknown ID', async (t) => {
  const tmpdir = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'entities-'))
  process.env.STORYLAB_DATA_DIR = tmpdir
  try {
    const app = await buildApp()
    const response = await app.inject({ method: 'GET', url: '/entities/nonexistent-id' })
    assert.strictEqual(response.statusCode, 404)
  } finally {
    delete process.env.STORYLAB_DATA_DIR
    rmSync(tmpdir, { recursive: true })
  }
})
