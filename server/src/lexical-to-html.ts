/**
 * Convert Lexical JSON AST to HTML string.
 * No DOM required, pure string-based recursive traversal.
 */

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

export interface LexicalNode {
  type: string
  tag?: string // for headings: h1, h2, h3
  text?: string
  format?: number // bitmask: bold=1, italic=2, underline=4, strikethrough=8, code=16
  mode?: string
  style?: string
  detail?: number
  children?: LexicalNode[]
  direction?: string | null
  listType?: 'bullet' | 'number'
  color?: string // for colored text nodes
  [key: string]: any
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Convert a text node with format bitmask to inline HTML
 * format: 1=bold, 2=italic, 4=underline, 8=strikethrough, 16=code
 */
function formatText(text: string, format: number = 0): string {
  const escaped = escapeHtml(text)
  let result = escaped

  if (format & 16) {
    result = `<code>${result}</code>`
  }
  if (format & 4) {
    result = `<u>${result}</u>`
  }
  if (format & 2) {
    result = `<em>${result}</em>`
  }
  if (format & 1) {
    result = `<strong>${result}</strong>`
  }

  return result
}

/**
 * Recursively convert Lexical nodes to HTML
 */
function nodesToHtml(nodes: LexicalNode[]): string {
  return nodes.map((node) => nodeToHtml(node)).join('')
}

/**
 * Convert a single Lexical node to HTML
 */
function nodeToHtml(node: LexicalNode): string {
  switch (node.type) {
    case 'paragraph':
      return `<p>${nodesToHtml(node.children || [])}</p>`

    case 'heading':
      {
        const tag = node.tag || 'h1' // fallback to h1
        const inner = nodesToHtml(node.children || [])
        return `<${tag}>${inner}</${tag}>`
      }

    case 'quote':
      return `<blockquote>${nodesToHtml(node.children || [])}</blockquote>`

    case 'code':
      {
        const inner = nodesToHtml(node.children || [])
        return `<pre><code>${escapeHtml(inner)}</code></pre>`
      }

    case 'list':
      {
        const listType = node.listType === 'number' ? 'ol' : 'ul'
        const inner = nodesToHtml(node.children || [])
        return `<${listType}>${inner}</${listType}>`
      }

    case 'listitem':
      return `<li>${nodesToHtml(node.children || [])}</li>`

    case 'linebreak':
      return '<br/>'

    case 'text':
      return formatText(node.text || '', node.format || 0)

    case 'colored':
      {
        const inner = formatText(node.text || '', node.format || 0)
        const color = node.color || '#000000'
        return `<span style="color:${escapeHtml(color)}">${inner}</span>`
      }

    case 'horizontalrule':
      return '<hr/>'

    case 'scene-break':
      return '<hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd; opacity: 0.6;"/>'

    case 'entity-mention':
      {
        const typeColours: Record<string, string> = {
          character: '#7c3aed',
          location: '#0d9488',
          item: '#b45309',
        }
        const colour = typeColours[node.entityType] || '#0066cc'
        return `<span style="color: ${colour}; border-bottom: 2px solid ${colour}; padding-bottom: 1px; font-weight: 500;" data-entity-id="${escapeHtml(node.entityId)}" data-entity-type="${escapeHtml(node.entityType)}">${escapeHtml(node.entityName)}</span>`
      }

    case 'table':
      {
        const inner = nodesToHtml(node.children || [])
        return `<table>${inner}</table>`
      }

    case 'tablerow':
      {
        const inner = nodesToHtml(node.children || [])
        return `<tr>${inner}</tr>`
      }

    case 'tablecell':
      {
        const inner = nodesToHtml(node.children || [])
        const tag = node.detail === 1 ? 'th' : 'td'
        return `<${tag}>${inner}</${tag}>`
      }

    case 'link':
      {
        const url = node.url || '#'
        const inner = nodesToHtml(node.children || [])
        return `<a href="${escapeHtml(url)}">${inner}</a>`
      }

    case 'image':
      {
        const cid = node.cid || ''
        const alt = escapeHtml(node.alt || '')
        return `<img src="http://localhost:3000/images/${cid}" alt="${alt}" style="max-width:100%"/>`
      }

    case 'annotation':
      {
        const category = node.category || 'draft-note'
        // Strip author-note annotations entirely; render other categories transparently
        if (category === 'author-note') {
          return ''
        }
        // For draft-note and needs-revision, render children without wrapper
        return nodesToHtml(node.children || [])
      }

    default:
      // Unknown node type: try to render children anyway
      return nodesToHtml(node.children || [])
  }
}

/**
 * Main export: Lexical JSON → HTML string (without wrapper)
 */
export function lexicalToHtml(lexicalJson: string): string {
  try {
    const parsed = JSON.parse(lexicalJson) as LexicalRoot
    const root = parsed.root
    return nodesToHtml(root.children || [])
  } catch (error) {
    console.error('Failed to parse Lexical JSON:', error)
    return ''
  }
}
