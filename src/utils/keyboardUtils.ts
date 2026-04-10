/**
 * Keyboard utilities for handling cross-platform keyboard layouts
 * Uses the `code` property (physical key location) instead of `key` property (character)
 * to work correctly with different keyboard layouts (US, German, French, etc.)
 */

export interface KeyboardShortcutConfig {
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  code?: string
  key?: string
}

/**
 * Check if a keyboard event matches a specific shortcut configuration
 * Prefers code-based detection (layout-independent) with fallback to key-based
 */
export function matchesKeyboardShortcut(
  event: KeyboardEvent,
  config: KeyboardShortcutConfig
): boolean {
  // Check modifiers
  if (config.metaKey !== undefined && event.metaKey !== config.metaKey) return false
  if (config.ctrlKey !== undefined && event.ctrlKey !== config.ctrlKey) return false
  if (config.shiftKey !== undefined && event.shiftKey !== config.shiftKey) return false
  if (config.altKey !== undefined && event.altKey !== config.altKey) return false

  // If code is specified, check code (layout-independent)
  if (config.code) {
    return event.code === config.code
  }

  // Fallback to key checking
  if (config.key) {
    return event.key === config.key || event.key === config.key.toUpperCase()
  }

  return false
}

/**
 * Detect common keyboard shortcuts in a keyboard-agnostic way
 */
export function detectCommonShortcuts(event: KeyboardEvent) {
  const isMeta = event.metaKey || event.ctrlKey

  return {
    // Save: Cmd/Ctrl+S
    isSave: isMeta && event.key === 's',

    // Find: Cmd/Ctrl+F (US: no shift required, works on all layouts)
    isFind: isMeta && event.key === 'f',

    // Help: Cmd/Ctrl+? (typically Shift+/)
    isHelp: isMeta && event.code === 'Slash' && event.shiftKey,

    // Slash commands: Cmd/Ctrl+/ (typically without shift)
    isSlashCommand: isMeta && event.code === 'Slash' && !event.shiftKey,

    // Typewriter mode: Cmd/Ctrl+T
    isTypewriterMode: isMeta && event.key === 't',

    // Escape
    isEscape: event.key === 'Escape',

    // Navigation arrows
    isArrowUp: event.code === 'ArrowUp',
    isArrowDown: event.code === 'ArrowDown',
    isArrowLeft: event.code === 'ArrowLeft',
    isArrowRight: event.code === 'ArrowRight',

    // Enter/Return
    isEnter: event.code === 'Enter',

    // Tab
    isTab: event.code === 'Tab',
  }
}

/**
 * Format a keyboard shortcut for display in the UI
 * Returns the shortcut as a string with proper capitalization
 */
export function formatShortcutDisplay(
  modifiers: {
    meta?: boolean
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
  },
  key: string
): string {
  const parts: string[] = []

  if (modifiers.ctrl) parts.push('Ctrl')
  if (modifiers.meta) {
    // Detect platform from user agent or use Cmd as default for Mac
    const isMac =
      typeof navigator !== 'undefined' &&
      navigator.userAgent.toLowerCase().includes('mac')
    parts.push(isMac ? 'Cmd' : 'Ctrl')
  }
  if (modifiers.alt) parts.push('Alt')
  if (modifiers.shift) parts.push('Shift')

  // Add the key with appropriate casing
  const lowerKey = key.toLowerCase()
  parts.push(
    // Uppercase if shift is used, otherwise use lowercase for letters
    modifiers.shift || ['/', '?', '!', '@', '#', '$', '%'].includes(key)
      ? key.toUpperCase()
      : lowerKey
  )

  return parts.join('+')
}

/**
 * Format a keyboard code for display
 */
export function formatCodeDisplay(
  modifiers: {
    meta?: boolean
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
  },
  code: string
): string {
  const keyMap: Record<string, string> = {
    Slash: modifiers.shift ? '?' : '/',
    Comma: modifiers.shift ? '<' : ',',
    Period: modifiers.shift ? '>' : '.',
    Semicolon: modifiers.shift ? ':' : ';',
    Quote: modifiers.shift ? '"' : "'",
    Backslash: modifiers.shift ? '|' : '\\',
    BracketLeft: modifiers.shift ? '{' : '[',
    BracketRight: modifiers.shift ? '}' : ']',
    Minus: modifiers.shift ? '_' : '-',
    Equal: modifiers.shift ? '+' : '=',
  }

  const key = keyMap[code] || code
  return formatShortcutDisplay(modifiers, key)
}
