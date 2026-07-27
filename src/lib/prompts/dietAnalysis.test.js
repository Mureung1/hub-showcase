import { describe, it, expect } from 'vitest'
import { buildDietAnalysisPrompt, countSentences, isDietAnalysisValid } from './dietAnalysis.js'

const SUMMARY = {
  startDate: '2026-07-21',
  endDate: '2026-07-27',
  recordedDays: 6,
  avgCalories: 1850,
  achievementRates: { calories: 92, protein: 150, carbs: 88, fat: 95, fiber: 20, sodium: 130 },
  topFoods: [{ name: '비빔밥', count: 3 }],
  exceededNutrients: ['단백질'],
  deficientNutrients: ['식이섬유'],
}

describe('countSentences / isDietAnalysisValid', () => {
  it('문장 4개 미만이면 invalid', () => {
    const text = '잘 드셨어요. 다만 나트륨이 조금 많아요.'
    expect(countSentences(text)).toBe(2)
    expect(isDietAnalysisValid(text)).toBe(false)
  })

  it('문장 4개 이상이면 valid', () => {
    const text = '단백질을 꾸준히 챙기고 계세요. 다만 나트륨 섭취가 다소 높은 편이에요. 국물은 반만 드셔보세요. 지금처럼만 유지하면 충분해요!'
    expect(countSentences(text)).toBe(4)
    expect(isDietAnalysisValid(text)).toBe(true)
  })

  it('빈 문자열/비문자열은 0문장', () => {
    expect(countSentences('')).toBe(0)
    expect(countSentences(undefined)).toBe(0)
  })
})

describe('buildDietAnalysisPrompt', () => {
  it('요약 수치를 프롬프트에 포함한다', () => {
    const prompt = buildDietAnalysisPrompt(SUMMARY, 7)
    expect(prompt).toContain('2026-07-21 ~ 2026-07-27')
    expect(prompt).toContain('실제 기록 6일')
    expect(prompt).toContain('1850kcal')
    expect(prompt).toContain('비빔밥(3회)')
    expect(prompt).toContain('단백질')
  })

  it('질병 진단/치료 표현 금지, 요약 밖 정보 언급 금지 규칙을 명시한다', () => {
    const prompt = buildDietAnalysisPrompt(SUMMARY, 7)
    expect(prompt).toContain('진단')
    expect(prompt).toContain('개인 정보는 절대 언급하지')
  })
})
