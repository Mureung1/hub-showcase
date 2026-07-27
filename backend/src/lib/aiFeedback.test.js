import { describe, it, expect } from 'vitest'
import { formatScoreComment } from './aiFeedback.js'

describe('formatScoreComment', () => {
  it('총점 + 항목별 + 한줄평을 사람이 읽을 텍스트로 만든다', () => {
    const out = formatScoreComment({
      total: 88,
      criteria: [
        { label: '구조 분해의 명료성', score: 23 },
        { label: '학습 곡선 설계 파악', score: 21 },
      ],
      reason: '규칙 정리는 탄탄하나 개선안 근거가 얕다.',
    })
    expect(out).toContain('총점 88/100')
    expect(out).toContain('· 구조 분해의 명료성: 23')
    expect(out).toContain('한줄평: 규칙 정리는 탄탄하나')
  })

  it('항목·근거가 없어도 총점 한 줄은 낸다', () => {
    expect(formatScoreComment({ total: 70, criteria: [] })).toBe('총점 70/100')
  })

  // 챌린지가 배점을 공개하므로, 채점 결과도 "22/30"처럼 배점 대비로 보여야 한다.
  it('채점 기준(배점)을 주면 점수를 배점 대비로 표기한다', () => {
    const out = formatScoreComment(
      { total: 82, criteria: [{ label: '구조 분해의 명료성', score: 22 }], reason: 'ok' },
      [{ label: '구조 분해의 명료성', weight: 30, hint: '무시됨' }],
    )
    expect(out).toContain('· 구조 분해의 명료성: 22/30')
  })

  it('옛 문자열 배열 기준도 깨지지 않는다(하위호환)', () => {
    const out = formatScoreComment({ total: 60, criteria: [{ label: '구체성', score: 15 }] }, [
      '구체성',
    ])
    expect(out).toContain('· 구체성: 15')
  })
})
