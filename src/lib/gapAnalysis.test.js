import { describe, it, expect } from 'vitest'
import { describeComputerSkill } from './gapAnalysis'

describe('describeComputerSkill', () => {
  it('true면 보유를 반환한다', () => {
    expect(describeComputerSkill(true)).toBe('보유')
  })

  it('false면 미보유를 반환한다', () => {
    expect(describeComputerSkill(false)).toBe('미보유')
  })
})
