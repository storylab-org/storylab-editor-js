/**
 * Parse EPUB3 files and extract chapters
 */

import { unzipSync, strFromU8 } from 'fflate'

export interface EpubChapter {
  name: string
  xhtmlBody: string
}

/**
 * Extract the OPF file path from container.xml
 */
function extractOpfPath(containerXml: string): string {
  const match = containerXml.match(/full-path="([^"]+)"/)
  if (!match || !match[1]) {
    throw new Error('Could not find OPF path in container.xml')
  }
  return match[1]
}

/**
 * Extract chapter title from XHTML <title> tag
 */
function extractChapterTitle(xhtml: string): string {
  const titleMatch = xhtml.match(/<title[^>]*>([^<]+)<\/title>/)
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim()
  }
  return 'Untitled'
}

/**
 * Extract <body> content from XHTML
 */
function extractBodyContent(xhtml: string): string {
  const bodyMatch = xhtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  if (!bodyMatch || !bodyMatch[1]) {
    return ''
  }

  let bodyContent = bodyMatch[1]

  // Strip the first <h1> (chapter name) that export.ts injects
  bodyContent = bodyContent.replace(/<h1[^>]*>[^<]*<\/h1>\s*/i, '')

  return bodyContent.trim()
}

/**
 * Parse OPF manifest and spine to get chapter order and file paths
 */
function parseOpf(
  opfContent: string,
  opfDir: string,
  zipFiles: Record<string, Uint8Array>
): Array<{ name: string; xhtmlBody: string }> {
  // Extract manifest items: <item id="..." href="..." />
  const manifestItems: Record<string, string> = {}
  const itemMatches = opfContent.matchAll(/<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"[^>]*\/>/g)
  for (const match of itemMatches) {
    const id = match[1]
    const href = match[2]
    manifestItems[id] = href
  }

  // Extract spine itemrefs in order: <itemref idref="..." />
  const spineIds: string[] = []
  const itemrefMatches = opfContent.matchAll(/<itemref[^>]*idref="([^"]*)"[^>]*\/>/g)
  for (const match of itemrefMatches) {
    spineIds.push(match[1])
  }

  // Map itemrefs to file paths
  const chapters: Array<{ name: string; xhtmlBody: string }> = []

  for (const id of spineIds) {
    const relativePath = manifestItems[id]
    if (!relativePath) continue

    // Resolve path relative to OPF directory
    // e.g. OPF is OEBPS/content.opf, href is chapter-1.xhtml → OEBPS/chapter-1.xhtml
    const fullPath = relativePath.startsWith('/')
      ? relativePath
      : `${opfDir}/${relativePath}`.replace(/\/+/g, '/')

    const xhtmlData = zipFiles[fullPath]
    if (!xhtmlData) {
      console.warn(`[EPUB] Chapter file not found: ${fullPath}`)
      continue
    }

    const xhtmlContent = strFromU8(xhtmlData)
    const chapterName = extractChapterTitle(xhtmlContent)
    const xhtmlBody = extractBodyContent(xhtmlContent)

    chapters.push({
      name: chapterName,
      xhtmlBody,
    })
  }

  return chapters
}

/**
 * Parse an EPUB file (ZIP format) and extract chapters in order
 */
export function parseEpub(data: Uint8Array): EpubChapter[] {
  let zipFiles: Record<string, Uint8Array>

  try {
    zipFiles = unzipSync(data)
  } catch (error) {
    throw new Error(`Failed to unzip EPUB: ${error}`)
  }

  // Validate mimetype
  const mimetypeData = zipFiles['mimetype']
  if (!mimetypeData) {
    throw new Error('EPUB missing mimetype file')
  }

  const mimetype = strFromU8(mimetypeData).trim()
  if (mimetype !== 'application/epub+zip') {
    throw new Error(
      `Invalid EPUB mimetype: "${mimetype}", expected "application/epub+zip"`
    )
  }

  // Read container.xml to find OPF path
  const containerXmlData = zipFiles['META-INF/container.xml']
  if (!containerXmlData) {
    throw new Error('EPUB missing META-INF/container.xml')
  }

  const containerXml = strFromU8(containerXmlData)
  const opfPath = extractOpfPath(containerXml)

  // Read OPF file
  const opfData = zipFiles[opfPath]
  if (!opfData) {
    throw new Error(`EPUB OPF file not found: ${opfPath}`)
  }

  const opfContent = strFromU8(opfData)

  // Get directory of OPF file (for relative paths)
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'))

  // Parse OPF and extract chapters
  return parseOpf(opfContent, opfDir, zipFiles)
}
