import { describe, it, expect } from 'vitest'
import { buildTrayAnalysisPrompt, parseTrayAnalysisResult } from './trayAnalysis.js'
import { assignTrayWeights } from '../mealPortions.js'

const TRAY_ITEMS = assignTrayWeights(['흰쌀밥', '된장찌개', '제육볶음'])

function validResult() {
  return {
    items: [
      { name: '흰쌀밥', weight: 210, calories: 300, protein: 5, carbs: 65, fat: 1, sodium: 5, fiber: 1 },
      { name: '된장찌개', weight: 300, calories: 120, protein: 8, carbs: 10, fat: 5, sodium: 900, fiber: 3 },
      { name: '제육볶음', weight: 120, calories: 280, protein: 20, carbs: 8, fat: 18, sodium: 600, fiber: 1 },
    ],
    total: { calories: 700, protein: 33, carbs: 83, fat: 24, sodium: 1505, fiber: 5 },
  }
}

describe('buildTrayAnalysisPrompt', () => {
  it('각 메뉴명과 중량(단위 포함)을 프롬프트에 담는다', () => {
    const prompt = buildTrayAnalysisPrompt(TRAY_ITEMS)
    expect(prompt).toContain('흰쌀밥 (210g)')
    expect(prompt).toContain('된장찌개 (300g)')
    expect(prompt).toContain('제육볶음 (120g)')
  })

  it('음료는 ml 단위로 표기한다', () => {
    const items = assignTrayWeights(['우유'])
    const prompt = buildTrayAnalysisPrompt(items)
    expect(prompt).toContain('우유 (200ml)')
  })

  it('JSON 출력 형식을 명시한다', () => {
    const prompt = buildTrayAnalysisPrompt(TRAY_ITEMS)
    expect(prompt).toContain('"items"')
    expect(prompt).toContain('"total"')
  })
})

describe('parseTrayAnalysisResult', () => {
  it('유효한 JSON을 파싱한다', () => {
    const raw = JSON.stringify(validResult())
    const result = parseTrayAnalysisResult(raw)
    expect(result.items).toHaveLength(3)
    expect(result.total.calories).toBe(700)
  })

  it('```json 코드펜스로 감싸도 파싱한다', () => {
    const raw = '```json\n' + JSON.stringify(validResult()) + '\n```'
    expect(parseTrayAnalysisResult(raw).items).toHaveLength(3)
  })

  it('영양소 키가 하나라도 빠지면 무효', () => {
    const bad = validResult()
    delete bad.items[0].sodium
    expect(parseTrayAnalysisResult(JSON.stringify(bad))).toBeNull()
  })

  it('total이 없으면 무효', () => {
    const bad = validResult()
    delete bad.total
    expect(parseTrayAnalysisResult(JSON.stringify(bad))).toBeNull()
  })

  it('items가 빈 배열이면 무효', () => {
    expect(parseTrayAnalysisResult(JSON.stringify({ items: [], total: validResult().total }))).toBeNull()
  })

  it('JSON이 아니면 무효', () => {
    expect(parseTrayAnalysisResult('그냥 문단입니다.')).toBeNull()
    expect(parseTrayAnalysisResult(undefined)).toBeNull()
  })
})
