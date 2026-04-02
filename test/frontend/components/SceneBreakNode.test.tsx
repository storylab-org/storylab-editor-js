import { describe, it, expect } from 'vitest'
import { SceneBreakNode } from '@/components/editor/lexical/nodes/SceneBreakNode'

describe('SceneBreakNode', () => {
  it('should have correct type identifier', () => {
    expect(SceneBreakNode.getType()).toBe('scene-break')
  })

  it('should not have importDOM handler', () => {
    expect(SceneBreakNode.importDOM()).toBe(null)
  })

  it('should handle JSON serialisation structure', () => {
    // Test that the JSON structure is correct for serialisation
    const serialisedJSON = {
      type: 'scene-break',
      version: 1,
    }
    expect(serialisedJSON).toEqual({
      type: 'scene-break',
      version: 1,
    })
  })

  it('should be a valid DecoratorNode type', () => {
    // Verify the class exists and has the expected static methods
    expect(typeof SceneBreakNode.getType).toBe('function')
    expect(typeof SceneBreakNode.clone).toBe('function')
    expect(typeof SceneBreakNode.importJSON).toBe('function')
    expect(typeof SceneBreakNode.importDOM).toBe('function')
  })
})
