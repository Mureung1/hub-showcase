import { describe, expect, it } from 'vitest'
import { toLearningRunState } from './workspaceInteraction'

describe('workspace persistence state', () => {
  it('persists only settled learner outcomes', () => {
    expect(toLearningRunState('idle')).toBe('idle')
    expect(toLearningRunState('compiling')).toBe('idle')
    expect(toLearningRunState('rendering')).toBe('idle')
    expect(toLearningRunState('timeout')).toBe('failed')
    expect(toLearningRunState('failed')).toBe('failed')
    expect(toLearningRunState('passed')).toBe('passed')
  })
})
