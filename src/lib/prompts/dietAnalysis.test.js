import { describe, it, expect } from 'vitest'
import { buildDietAnalysisPrompt, parseDietAnalysisFindings, isDietAnalysisValid } from './dietAnalysis.js'

const SUMMARY = {
  startDate: '2026-07-21',
  endDate: '2026-07-27',
  recordedDays: 6,
  avgCalories: 1850,
  avgIntake: { calories: 1850, protein: 90, carbs: 264, fat: 57, fiber: 5, sodium: 2600 },
  achievementRates: { calories: 92, protein: 150, carbs: 88, fat: 95, fiber: 20, sodium: 130 },
  topFoods: [{ name: '비빔밥', count: 3 }],
  exceededNutrients: ['단백질'],
  deficientNutrients: ['식이섬유'],
}

function findings(overrides = []) {
  return [
    { summary: '단백질을 잘 챙기고 있어요', detail: '최근 6일 평균 단백질 90g으로 목표의 150%예요.', type: 'good' },
    { summary: '나트륨 섭취가 다소 높아요', detail: '최근 6일 평균 나트륨 2,600mg으로 권장량의 130%예요.', type: 'warn' },
    { summary: '식이섬유가 부족해요', detail: '최근 6일 평균 식이섬유 5g으로 목표의 20%에 그쳐요.', type: 'warn' },
    { summary: '채소 반찬을 늘려보세요', detail: '나물이나 샐러드를 한 끼에 한 가지씩 추가해보세요.', type: 'tip' },
    ...overrides,
  ]
}

describe('buildDietAnalysisPrompt', () => {
  it('요약 수치(절대량+달성률)를 프롬프트에 포함한다', () => {
    const prompt = buildDietAnalysisPrompt(SUMMARY, 7)
    expect(prompt).toContain('2026-07-21 ~ 2026-07-27')
    expect(prompt).toContain('실제 기록 6일')
    expect(prompt).toContain('일평균 2600mg')
    expect(prompt).toContain('권장 대비 130%')
    expect(prompt).toContain('비빔밥(3회)')
  })

  it('JSON findings 출력 형식과 개수·good 최소 1개 규칙을 명시한다', () => {
    const prompt = buildDietAnalysisPrompt(SUMMARY, 7)
    expect(prompt).toContain('findings')
    expect(prompt).toContain('good')
    expect(prompt).toContain('warn')
    expect(prompt).toContain('tip')
  })

  it('질병 진단/치료 표현 금지, 요약 밖 정보 언급 금지 규칙을 명시한다', () => {
    const prompt = buildDietAnalysisPrompt(SUMMARY, 7)
    expect(prompt).toContain('진단')
    expect(prompt).toContain('개인 식별 정보는 절대 언급하지')
  })
})

describe('parseDietAnalysisFindings / isDietAnalysisValid', () => {
  it('유효한 JSON(마크다운 펜스 없음)을 파싱한다', () => {
    const raw = JSON.stringify({ findings: findings() })
    const result = parseDietAnalysisFindings(raw)
    expect(result).toHaveLength(4)
    expect(isDietAnalysisValid(raw)).toBe(true)
  })

  it('```json 코드펜스로 감싸도 파싱한다', () => {
    const raw = '```json\n' + JSON.stringify({ findings: findings() }) + '\n```'
    expect(parseDietAnalysisFindings(raw)).toHaveLength(4)
  })

  it('findings가 4개 미만이면 무효', () => {
    const raw = JSON.stringify({ findings: findings().slice(0, 3) })
    expect(parseDietAnalysisFindings(raw)).toBeNull()
    expect(isDietAnalysisValid(raw)).toBe(false)
  })

  it('findings가 6개 초과면 무효', () => {
    const extra = findings().concat([
      { summary: '여섯', detail: '여섯 번째', type: 'tip' },
      { summary: '일곱', detail: '일곱 번째', type: 'tip' },
      { summary: '여덟', detail: '여덟 번째', type: 'tip' },
    ])
    const raw = JSON.stringify({ findings: extra })
    expect(parseDietAnalysisFindings(raw)).toBeNull()
  })

  it('type="good"이 하나도 없으면 무효', () => {
    const noGood = findings().map((f) => (f.type === 'good' ? { ...f, type: 'tip' } : f))
    const raw = JSON.stringify({ findings: noGood })
    expect(parseDietAnalysisFindings(raw)).toBeNull()
  })

  it('알 수 없는 type 값이 섞여 있으면 무효', () => {
    const bad = findings()
    bad[1] = { ...bad[1], type: 'danger' }
    const raw = JSON.stringify({ findings: bad })
    expect(parseDietAnalysisFindings(raw)).toBeNull()
  })

  it('summary/detail이 빈 문자열이면 무효', () => {
    const bad = findings()
    bad[0] = { ...bad[0], detail: '' }
    const raw = JSON.stringify({ findings: bad })
    expect(parseDietAnalysisFindings(raw)).toBeNull()
  })

  it('JSON이 아니거나 findings 키가 없으면 무효', () => {
    expect(parseDietAnalysisFindings('그냥 문단 텍스트입니다.')).toBeNull()
    expect(parseDietAnalysisFindings(JSON.stringify({ other: [] }))).toBeNull()
    expect(parseDietAnalysisFindings(undefined)).toBeNull()
  })
})
