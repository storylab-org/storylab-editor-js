/**
 * Convert Lexical JSON AST to Markdown string.
 * Pure recursive traversal, no external dependencies needed.
 */

import type { LexicalNode, LexicalRoot } from './lexical-to-html'

/**
 * Escape Markdown special characters (but not inside code blocks)
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
}

/**
 * Format text with Markdown syntax based on format bitmask
 * format: 1=bold, 2=italic, 4=underline, 8=strikethrough, 16=code
 */
function formatTextMarkdown(text: string, format: number = 0): string {
  const escaped = escapeMarkdown(text)
  let result = escaped

  if (format & 16) {
    result = `\`${result}\``
  }
  if (format & 8) {
    result = `~~${result}~~`
  }
  if (format & 4) {
    result = `<u>${result}</u>` // Markdown doesn't support underline, use HTML
  }
  if (format & 2) {
    result = `_${result}_`
  }
  if (format & 1) {
    result = `**${result}**`
  }

  return result
}

/**
 * Track context for list handling (nested indentation)
 */
interface ConversionContext {
  inList: boolean
  listDepth: number
  listType?: 'bullet' | 'number'
  listItemIndex?: number
}

/**
 * Recursively convert Lexical nodes to Markdown
 */
function nodesToMarkdown(nodes: LexicalNode[], ctx: ConversionContext = { inList: false, listDepth: 0 }): string {
  return nodes.map((node) => nodeToMarkdown(node, ctx)).join('')
}

/**
 * Convert a single Lexical node to Markdown
 */
function nodeToMarkdown(node: LexicalNode, ctx: ConversionContext): string {
  switch (node.type) {
    case 'paragraph':
      {
        const inner = nodesToMarkdown(node.children || [], ctx)
        if (ctx.inList) {
          // Inside a list, just return the content (newline will be added by listitem)
          return inner
        }
        return inner + '\n\n'
      }

    case 'heading':
      {
        const level = node.tag === 'h1' ? 1 : node.tag === 'h2' ? 2 : node.tag === 'h3' ? 3 : 1
        const hashes = '#'.repeat(level)
        const inner = nodesToMarkdown(node.children || [], ctx)
        return `${hashes} ${inner}\n\n`
      }

    case 'quote':
      {
        const inner = nodesToMarkdown(node.children || [], ctx)
        const lines = inner.trim().split('\n')
        const quoted = lines.map((line) => `> ${line}`).join('\n')
        return quoted + '\n\n'
      }

    case 'code':
      {
        const inner = nodesToMarkdown(node.children || [], ctx)
        return `\`\`\`\n${inner}\`\`\`\n\n`
      }

    case 'list':
      {
        const listType = node.listType || 'bullet'
        const childCtx = {
          ...ctx,
          inList: true,
          listDepth: ctx.listDepth + 1,
          listType,
          listItemIndex: 0,
        }
        const inner = nodesToMarkdown(node.children || [], childCtx)
        if (ctx.inList) {
          return inner
        }
        return inner + '\n'
      }

    case 'listitem':
      {
        const itemIdx = (ctx.listItemIndex || 0) + 1
        const prefix = ctx.listType === 'number' ? `${itemIdx}.` : '-'
        const indent = '  '.repeat(ctx.listDepth - 1)
        const childCtx = { ...ctx, listItemIndex: itemIdx }
        const inner = nodesToMarkdown(node.children || [], childCtx)
        // Trim extra newlines and split by line
        const lines = inner.trim().split('\n')
        if (lines.length === 0) return ''
        const result = lines
          .map((line, idx) => {
            if (idx === 0) {
              return `${indent}${prefix} ${line}`
            }
            return `${indent}  ${line}`
          })
          .join('\n')
        return result + '\n'
      }

    case 'linebreak':
      return '\n'

    case 'text':
      return formatTextMarkdown(node.text || '', node.format || 0)

    case 'colored':
      {
        const inner = formatTextMarkdown(node.text || '', node.format || 0)
        // Markdown doesn't support colored text, just return the formatted text
        return inner
      }

    case 'horizontalrule':
      return '---\n\n'

    case 'scene-break':
      return '---\n\n'

    case 'entity-mention':
      return node.entityName || ''

    case 'table':
      {
        // Tables are complex in Markdown; for now, just render contents
        const inner = nodesToMarkdown(node.children || [], ctx)
        return inner
      }

    case 'tablerow':
      {
        // Basic table row rendering (simplified)
        const cells = (node.children || []).map((cell) => nodesToMarkdown([cell], ctx).trim()).join(' | ')
        return `| ${cells} |\n`
      }

    case 'tablecell':
      {
        const inner = nodesToMarkdown(node.children || [], ctx).trim()
        return inner
      }

    case 'link':
      {
        const url = node.url || '#'
        const inner = nodesToMarkdown(node.children || [], ctx)
        return `[${inner}](${url})`
      }

    case 'image':
      {
        const cid = node.cid || ''
        const alt = node.alt || ''
        return `![${alt}](http://localhost:3000/images/${cid})`
      }

    case 'annotation':
      {
        const category = node.category || 'draft-note'
        // Strip author-note annotations entirely; render other categories transparently
        if (category === 'author-note') {
          return ''
        }
        // For draft-note and needs-revision, render children without wrapper
        return nodesToMarkdown(node.children || [], ctx)
      }

    default:
      // Unknown node type: render children
      return nodesToMarkdown(node.children || [], ctx)
  }
}

/**
 * Main export: Lexical JSON → Markdown string
 */
export function lexicalToMarkdown(lexicalJson: string): string {
  try {
    const parsed = JSON.parse(lexicalJson) as LexicalRoot
    const root = parsed.root
    const markdown = nodesToMarkdown(root.children || [])
    return markdown.trim()
  } catch (error) {
    console.error('Failed to parse Lexical JSON:', error)
    return ''
  }
}
