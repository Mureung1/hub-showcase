import { describe, it, expect } from 'vitest'
import {
  findSecurityQuestion,
  normalizeSecurityAnswer,
  SECURITY_QUESTIONS,
  validateQuestionId,
  validateSecurityAnswer,
} from './securityQuestions.js'

describe('SECURITY_QUESTIONS', () => {
  it('id가 전부 유일하다', () => {
    const ids = SECURITY_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('findSecurityQuestion', () => {
  it('존재하는 id는 질문 객체를 반환한다', () => {
    expect(findSecurityQuestion('first-pet')?.question).toContain('반려동물')
  })

  it('존재하지 않는 id는 null을 반환한다', () => {
    expect(findSecurityQuestion('nope')).toBeNull()
  })
})

describe('validateQuestionId', () => {
  it('목록에 있는 id는 유효(null)하다', () => {
    expect(validateQuestionId('childhood-nickname')).toBeNull()
  })

  it('빈 값/목록 밖 id는 에러 문구를 반환한다', () => {
    expect(validateQuestionId('')).not.toBeNull()
    expect(validateQuestionId(undefined)).not.toBeNull()
    expect(validateQuestionId('made-up-id')).not.toBeNull()
  })
})

describe('validateSecurityAnswer', () => {
  it('빈 값/공백만 있으면 에러 문구를 반환한다', () => {
    expect(validateSecurityAnswer('')).not.toBeNull()
    expect(validateSecurityAnswer('   ')).not.toBeNull()
  })

  it('30자 이하는 유효하다', () => {
    expect(validateSecurityAnswer('멍멍이')).toBeNull()
  })

  it('30자를 초과하면 에러 문구를 반환한다', () => {
    expect(validateSecurityAnswer('가'.repeat(31))).not.toBeNull()
  })
})

describe('normalizeSecurityAnswer', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeSecurityAnswer('  멍멍이  ')).toBe('멍멍이')
  })

  it('대소문자를 구분하지 않는다', () => {
    expect(normalizeSecurityAnswer('Rex')).toBe(normalizeSecurityAnswer('rex'))
  })

  it('중간 공백도 제거한다', () => {
    expect(normalizeSecurityAnswer('부 산')).toBe('부산')
  })

  it('undefined/null도 예외 없이 빈 문자열로 처리한다', () => {
    expect(normalizeSecurityAnswer(undefined)).toBe('')
    expect(normalizeSecurityAnswer(null)).toBe('')
  })
})
