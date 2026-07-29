import { describe, it, expect, vi } from 'vitest'
import { buildMealBadges, drawMealCard, mergeNutrientTotals, TEMPLATES } from './mealCardCanvas.js'

describe('mergeNutrientTotals', () => {
  it('같은 키를 더한다', () => {
    expect(mergeNutrientTotals({ protein: 10, calories: 200 }, { protein: 5, calories: 100 })).toEqual({
      protein: 15,
      calories: 300,
    })
  })

  it('한쪽에만 있는 키도 그대로 포함한다', () => {
    expect(mergeNutrientTotals({ protein: 10 }, { sodium: 500 })).toEqual({ protein: 10, sodium: 500 })
  })

  it('둘 다 비어있거나 없어도 예외 없이 빈 객체를 준다', () => {
    expect(mergeNutrientTotals(undefined, undefined)).toEqual({})
    expect(mergeNutrientTotals({}, {})).toEqual({})
  })
})

describe('buildMealBadges', () => {
  it('단백질 칼로리 비중이 25% 이상이면 #고단백을 붙인다', () => {
    // 단백질 30g(=120kcal) / 총 400kcal = 30% >= 25%
    expect(buildMealBadges({ calories: 400, protein: 30, sodium: 0 })).toContain('#고단백')
  })

  it('단백질 비중이 낮으면 #고단백을 붙이지 않는다', () => {
    expect(buildMealBadges({ calories: 800, protein: 10, sodium: 0 })).not.toContain('#고단백')
  })

  it('나트륨이 하루 상한의 절반(1000mg) 이상이면 #나트륨주의를 붙인다', () => {
    expect(buildMealBadges({ calories: 500, protein: 0, sodium: 1200 })).toContain('#나트륨주의')
  })

  it('나트륨이 적으면 #나트륨주의를 붙이지 않는다', () => {
    expect(buildMealBadges({ calories: 500, protein: 0, sodium: 300 })).not.toContain('#나트륨주의')
  })

  it('calories가 0이면 나눗셈 오류 없이 #고단백을 안 붙인다', () => {
    expect(() => buildMealBadges({ calories: 0, protein: 10, sodium: 0 })).not.toThrow()
    expect(buildMealBadges({ calories: 0, protein: 10, sodium: 0 })).not.toContain('#고단백')
  })

  it('mealTotal이 없어도 예외 없이 빈 배지 배열을 준다', () => {
    expect(buildMealBadges(undefined)).toEqual([])
  })
})

describe('TEMPLATES', () => {
  it('story는 9:16, feed는 1:1 비율이다', () => {
    expect(TEMPLATES.story.width / TEMPLATES.story.height).toBeCloseTo(9 / 16, 5)
    expect(TEMPLATES.feed.width).toBe(TEMPLATES.feed.height)
  })
})

function createMockCtx() {
  return {
    calls: [],
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  }
}

describe('drawMealCard', () => {
  it('예외 없이 그리기 호출들을 수행한다', () => {
    const ctx = createMockCtx()
    const photoImage = { width: 800, height: 600 }
    expect(() =>
      drawMealCard(ctx, { photoImage, width: 1080, height: 1920, score: 92, badges: ['#고단백'] }),
    ).not.toThrow()
    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalledWith('92점', expect.any(Number), expect.any(Number))
  })

  it('score가 숫자가 아니면 점수 텍스트를 그리지 않는다', () => {
    const ctx = createMockCtx()
    const photoImage = { width: 800, height: 600 }
    drawMealCard(ctx, { photoImage, width: 1080, height: 1080, score: null, badges: [] })
    const scoreCalls = ctx.fillText.mock.calls.filter((args) => String(args[0]).includes('점'))
    expect(scoreCalls).toHaveLength(0)
  })
})
