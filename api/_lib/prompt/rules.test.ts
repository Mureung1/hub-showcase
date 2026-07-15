import { describe, expect, it } from 'vitest'
import { relationshipRules } from './relationshipRules'
import { situationRules } from './situationRules'

describe('prompt rules', () => {
  it('4개 관계 규칙을 모두 제공하고 관계별 말투 하한선을 유지한다', () => {
    expect(Object.keys(relationshipRules)).toEqual([
      'groupwork',
      'professor',
      'senior',
      'friend',
    ])
    expect(relationshipRules.groupwork).toContain('해요체')
    expect(relationshipRules.professor).toContain('합니다체')
    expect(relationshipRules.senior).toContain('해요체')
    expect(relationshipRules.friend).toContain('반말')
  })

  it('6개 목적 규칙을 모두 제공하고 거절·사과의 사실 경계를 명시한다', () => {
    expect(Object.keys(situationRules)).toEqual([
      'ask',
      'apologize',
      'decline',
      'question',
      'suggest',
      'other',
    ])
    expect(situationRules.apologize).toContain('입력에 없는 책임')
    expect(situationRules.decline).toContain('핑계를 만들지')
  })
})
