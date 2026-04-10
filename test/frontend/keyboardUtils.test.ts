import { describe, it, expect } from 'vitest'
import { detectCommonShortcuts, formatShortcutDisplay } from '@/utils/keyboardUtils'

describe('keyboardUtils', () => {
  describe('detectCommonShortcuts', () => {
    it('detects Cmd+S (save) on Mac', () => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        metaKey: true,
        ctrlKey: false,
      })
      const shortcuts = detectCommonShortcuts(event)
      expect(shortcuts.isSave).toBe(true)
    })

    it('detects Ctrl+S (save) on Windows/Linux', () => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        metaKey: false,
        ctrlKey: true,
      })
      const shortcuts = detectCommonShortcuts(event)
      expect(shortcuts.isSave).toBe(true)
    })

    it('detects Cmd+F (find)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'f',
        code: 'KeyF',
        metaKey: true,
      })
      const shortcuts = detectCommonShortcuts(event)
      expect(shortcuts.isFind).toBe(true)
    })

    it('detects Cmd+/ (slash command) on any keyboard layout', () => {
      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        metaKey: true,
        shiftKey: false,
      })
      const shortcuts = detectCommonShortcuts(event)
      expect(shortcuts.isSlashCommand).toBe(true)
    })

    it('detects Cmd+Shift+/ (help = ?) on any keyboard layout', () => {
      const event = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        metaKey: true,
        shiftKey: true,
      })
      const shortcuts = detectCommonShortcuts(event)
      expect(shortcuts.isHelp).toBe(true)
    })

    it('detects Cmd+T (typewriter mode)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 't',
        code: 'KeyT',
        metaKey: true,
      })
      const shortcuts = detectCommonShortcuts(event)
      expect(shortcuts.isTypewriterMode).toBe(true)
    })

    it('handles German keyboard layout for Cmd+?', () => {
      // On German keyboards, ? is typically on a different key or requires Shift
      // The important thing is that we check the code (Slash) and shiftKey
      const event = new KeyboardEvent('keydown', {
        key: '?', // May not be '?' on German keyboard, but code is what matters
        code: 'Slash',
        metaKey: true,
        shiftKey: true,
      })
      const shortcuts = detectCommonShortcuts(event)
      expect(shortcuts.isHelp).toBe(true)
    })

    it('distinguishes between / and ? based on shift key', () => {
      // Without shift: /
      const slashEvent = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        metaKey: true,
        shiftKey: false,
      })
      const slashShortcuts = detectCommonShortcuts(slashEvent)
      expect(slashShortcuts.isSlashCommand).toBe(true)
      expect(slashShortcuts.isHelp).toBe(false)

      // With shift: ?
      const helpEvent = new KeyboardEvent('keydown', {
        key: '?',
        code: 'Slash',
        metaKey: true,
        shiftKey: true,
      })
      const helpShortcuts = detectCommonShortcuts(helpEvent)
      expect(helpShortcuts.isSlashCommand).toBe(false)
      expect(helpShortcuts.isHelp).toBe(true)
    })
  })

  describe('formatShortcutDisplay', () => {
    it('formats with lowercase letter when no shift', () => {
      const display = formatShortcutDisplay({ meta: true }, 'b')
      // Should contain 'b' in lowercase (not 'B')
      expect(display).toMatch(/\+b$/)
    })

    it('formats with uppercase letter and Shift prefix when shift is used', () => {
      const display = formatShortcutDisplay({ meta: true, shift: true }, 'z')
      // Should contain 'Shift' and uppercase 'Z'
      expect(display).toMatch(/Shift\+Z/)
    })

    it('formats special characters correctly', () => {
      const display = formatShortcutDisplay({ meta: true, shift: true }, '?')
      // Should contain the special character
      expect(display).toMatch(/\?/)
    })

    it('formats basic keys with lowercase', () => {
      const display = formatShortcutDisplay({ meta: true }, 's')
      // Should contain 's' in lowercase
      expect(display).toMatch(/\+s$/)
    })
  })
})
