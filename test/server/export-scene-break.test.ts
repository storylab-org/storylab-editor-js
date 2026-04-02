import { test } from 'node:test'
import * as assert from 'node:assert'
import { lexicalToMarkdown } from '../../server/dist/lexical-to-markdown.js'
import { lexicalToHtml } from '../../server/dist/lexical-to-html.js'

test('SceneBreakNode exports to Markdown as ---', async (t) => {
  const state = {
    root: {
      children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Scene 1' }] },
        { type: 'scene-break' },
        { type: 'paragraph', children: [{ type: 'text', text: 'Scene 2' }] },
      ],
    },
  }

  const markdown = lexicalToMarkdown(JSON.stringify(state))
  assert.ok(markdown.includes('---'), 'Markdown should contain divider')
  assert.ok(markdown.includes('Scene 1'), 'Should preserve paragraph before break')
  assert.ok(markdown.includes('Scene 2'), 'Should preserve paragraph after break')
})

test('SceneBreakNode exports to HTML as <hr>', async (t) => {
  const state = {
    root: {
      children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Scene 1' }] },
        { type: 'scene-break' },
        { type: 'paragraph', children: [{ type: 'text', text: 'Scene 2' }] },
      ],
    },
  }

  const html = lexicalToHtml(JSON.stringify(state))
  assert.ok(html.includes('<hr'), 'HTML should contain <hr> element')
  assert.ok(html.includes('Scene 1'), 'Should preserve paragraph before break')
  assert.ok(html.includes('Scene 2'), 'Should preserve paragraph after break')
})

test('SceneBreakNode renders with proper styling in HTML', async (t) => {
  const state = {
    root: {
      children: [
        { type: 'scene-break' },
      ],
    },
  }

  const html = lexicalToHtml(JSON.stringify(state))
  assert.ok(html.includes('<hr'), 'Should render as <hr> element')
  assert.ok(html.includes('margin'), 'Should have margin styling')
  assert.ok(html.includes('border'), 'Should have border styling')
  assert.ok(html.includes('opacity'), 'Should have opacity styling')
})

test('Multiple scene breaks are preserved', async (t) => {
  const state = {
    root: {
      children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Scene 1' }] },
        { type: 'scene-break' },
        { type: 'paragraph', children: [{ type: 'text', text: 'Scene 2' }] },
        { type: 'scene-break' },
        { type: 'paragraph', children: [{ type: 'text', text: 'Scene 3' }] },
      ],
    },
  }

  const markdown = lexicalToMarkdown(JSON.stringify(state))
  const dividerCount = (markdown.match(/---/g) || []).length
  assert.strictEqual(dividerCount, 2, `Should have 2 dividers, got ${dividerCount}`)
})
