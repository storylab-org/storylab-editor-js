/**
 * Convert HTML string to Lexical JSON AST
 * Reverse of lexical-to-html.ts
 */

import * as parse5 from 'parse5'

export interface LexicalNode {
  type: string
  tag?: string
  text?: string
  format?: number
  mode?: string
  style?: string
  detail?: number
  children?: LexicalNode[]
  direction?: string | null
  listType?: 'bullet' | 'number'
  color?: string
  [key: string]: any
}

export interface LexicalRoot {
  root: {
    children: LexicalNode[]
    direction: string | null
    format: string
    indent: number
    type: string
    version: number
  }
}

/**
 * Get text content from an HTML node
 */
function getNodeText(node: any): string {
  if ('nodeName' in node && node.nodeName === '#text') {
    return node.value
  }

  if ('childNodes' in node && node.childNodes) {
    return node.childNodes.map(getNodeText).join('')
  }

  return ''
}

/**
 * Extract text from direct text node children (for code blocks)
 */
function getDirectTextContent(node: any): string {
  if (!('childNodes' in node)) return ''

  let text = ''
  for (const child of node.childNodes) {
    if ('nodeName' in child && child.nodeName === '#text') {
      text += child.value
    } else if ('childNodes' in child) {
      // Recursively get text from nested elements
      text += getDirectTextContent(child)
    }
  }
  return text
}

/**
 * Strip HTML special characters for inline code
 */
function unescapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  }
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => map[entity])
}

/**
 * Walk HTML AST and build Lexical nodes
 * currentFormat tracks inline formatting (bold=1, italic=2, underline=4, strikethrough=8, code=16)
 */
function walkHtmlNode(node: any, currentFormat: number = 0): LexicalNode[] {
  // Text node
  if ('nodeName' in node && node.nodeName === '#text') {
    const text = node.value.trim()
    if (!text) return []
    return [{ type: 'text', text, format: currentFormat || 0 }]
  }

  if (!('nodeName' in node) || !('childNodes' in node)) {
    return []
  }

  const tagName = node.nodeName.toLowerCase()

  // Block elements
  if (tagName === 'p') {
    return [
      {
        type: 'paragraph',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
    return [
      {
        type: 'heading',
        tag: tagName,
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'blockquote') {
    return [
      {
        type: 'quote',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'pre' || tagName === 'code') {
    // <pre><code> or bare <code> block
    const codeContent = getDirectTextContent(node)
    return [{ type: 'code', children: [{ type: 'text', text: unescapeHtml(codeContent) }] }]
  }

  if (tagName === 'ul') {
    return [
      {
        type: 'list',
        listType: 'bullet',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'ol') {
    return [
      {
        type: 'list',
        listType: 'number',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'li') {
    return [
      {
        type: 'listitem',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'br') {
    return [{ type: 'linebreak' }]
  }

  if (tagName === 'hr') {
    // Check if it's a scene break based on style
    const attrs = node.attrs || []
    const styleAttr = attrs.find((a: any) => a.name === 'style')?.value || ''
    if (styleAttr.includes('margin: 32px')) {
      return [{ type: 'scene-break' }]
    }
    return [{ type: 'horizontalrule' }]
  }

  if (tagName === 'table') {
    return [
      {
        type: 'table',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'tr') {
    return [
      {
        type: 'tablerow',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'th' || tagName === 'td') {
    return [
      {
        type: 'tablecell',
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  // Inline formatting elements
  if (tagName === 'strong' || tagName === 'b') {
    return walkHtmlChildren(node, currentFormat | 1)
  }

  if (tagName === 'em' || tagName === 'i') {
    return walkHtmlChildren(node, currentFormat | 2)
  }

  if (tagName === 'u') {
    return walkHtmlChildren(node, currentFormat | 4)
  }

  if (tagName === 's' || tagName === 'del') {
    return walkHtmlChildren(node, currentFormat | 8)
  }

  if (tagName === 'code' && (currentFormat & 16) === 0) {
    // Inline code (not in a <pre> block)
    return walkHtmlChildren(node, currentFormat | 16)
  }

  if (tagName === 'a') {
    const attrs = node.attrs || []
    const href = attrs.find((a: any) => a.name === 'href')?.value || ''
    return [
      {
        type: 'link',
        url: href,
        children: walkHtmlChildren(node, currentFormat),
      },
    ]
  }

  if (tagName === 'span') {
    const attrs = node.attrs || []
    const styleAttr = attrs.find((a: any) => a.name === 'style')?.value || ''
    const dataEntityId = attrs.find((a: any) => a.name === 'data-entity-id')?.value
    const dataEntityType = attrs.find((a: any) => a.name === 'data-entity-type')?.value

    // Check for entity mention
    if (dataEntityId && dataEntityType) {
      return [
        {
          type: 'entity-mention',
          entityId: dataEntityId,
          entityType: dataEntityType,
          entityName: getNodeText(node),
        },
      ]
    }

    // Check for colored text
    if (styleAttr.includes('color:')) {
      const match = styleAttr.match(/color:\s*(#[0-9a-fA-F]{6}|[a-zA-Z]+)/)
      const color = match ? match[1] : '#000000'
      const text = getNodeText(node)
      return [{ type: 'colored', text, color, format: currentFormat }]
    }

    // Regular span - treat as transparent
    return walkHtmlChildren(node, currentFormat)
  }

  // Unknown element - recurse transparently
  return walkHtmlChildren(node, currentFormat)
}

/**
 * Walk children of an HTML element
 */
function walkHtmlChildren(element: any, currentFormat: number = 0): LexicalNode[] {
  if (!element.childNodes) return []

  const children: LexicalNode[] = []
  for (const child of element.childNodes) {
    const nodes = walkHtmlNode(child, currentFormat)
    children.push(...nodes)
  }
  return children
}

/**
 * Main entry point: convert HTML string to Lexical JSON
 */
export function htmlToLexical(html: string): string {
  // Parse HTML fragment
  const fragment = parse5.parseFragment(html)

  // Walk the tree
  const children = walkHtmlChildren(fragment as any)

  // Build Lexical root structure
  const root: LexicalRoot = {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children,
    },
  }

  return JSON.stringify(root)
}
