import { describe, expect, it } from 'vitest'
import type {
  RecommendationSituation,
  StoreReviewSummary,
} from '../../types/recommendation'

const SITUATION_WEIGHTS: Record<
  RecommendationSituation,
  Partial<Record<keyof StoreReviewSummary, number>>
> = {
  study: {
    quietScore: 0.55,
    atmosphereScore: 0.2,
    valueScore: 0.15,
    speedScore: 0.1,
  },
  date: {
    atmosphereScore: 0.5,
    tasteScore: 0.25,
    quietScore: 0.15,
    speedScore: 0.1,
  },
  valueMeal: {
    valueScore: 0.6,
    tasteScore: 0.3,
    speedScore: 0.1,
  },
  quickMeal: {
    speedScore: 0.7,
    tasteScore: 0.15,
    valueScore: 0.15,
  },
}

function caclulationSituationScoreTest(
  situation: RecommendationSituation,
  summary: StoreReviewSummary,
): number {
  const score = Object.entries(SITUATION_WEIGHTS[situation]).reduce(
    (total, [field, weight]) =>
      total + Number(summary[field as keyof StoreReviewSummary]) * weight,
    0,
  )

  return Math.round(score)
}

function createSummary(
  scores: Partial<StoreReviewSummary> = {},
): StoreReviewSummary {
  return {
    kakaoPlaceId: 'test-place',
    reviewCount: 0,
    rating: null,
    tasteScore: 0,
    valueScore: 0,
    atmosphereScore: 0,
    quietScore: 0,
    speedScore: 0,
    ratingDataCount: 0,
    ...scores,
  }
}

describe('caclulationSituationScoreTest', () => {
  describe.each<RecommendationSituation>([
    'study',
    'date',
    'valueMeal',
    'quickMeal',
  ])('%s 상황의 경계값', (situation) => {
    it('모든 점수가 0이면 0을 반환한다', () => {
      expect(caclulationSituationScoreTest(situation, createSummary())).toBe(0)
    })

    it('모든 점수가 100이면 100을 반환한다', () => {
      expect(
        caclulationSituationScoreTest(
          situation,
          createSummary({
            tasteScore: 100,
            valueScore: 100,
            atmosphereScore: 100,
            quietScore: 100,
            speedScore: 100,
          }),
        ),
      ).toBe(100)
    })
  })

  describe('공부하기 좋은 상황', () => {
    it.each([
      [{ quietScore: 100 }, 55],
      [{ atmosphereScore: 100 }, 20],
      [{ valueScore: 100 }, 15],
      [{ speedScore: 100 }, 10],
      [{ tasteScore: 100 }, 0],
    ] as const)('입력 %o이면 %i를 반환한다', (scores, expected) => {
      expect(caclulationSituationScoreTest('study', createSummary(scores))).toBe(
        expected,
      )
    })

    it('여러 평가 점수에 공부 상황 가중치를 적용한다', () => {
      expect(
        caclulationSituationScoreTest(
          'study',
          createSummary({
            quietScore: 100,
            atmosphereScore: 80,
            valueScore: 60,
            speedScore: 40,
          }),
        ),
      ).toBe(84)
    })
  })

  describe('데이트 상황', () => {
    it.each([
      [{ atmosphereScore: 100 }, 50],
      [{ tasteScore: 100 }, 25],
      [{ quietScore: 100 }, 15],
      [{ speedScore: 100 }, 10],
      [{ valueScore: 100 }, 0],
    ] as const)('입력 %o이면 %i를 반환한다', (scores, expected) => {
      expect(caclulationSituationScoreTest('date', createSummary(scores))).toBe(
        expected,
      )
    })

    it('여러 평가 점수에 데이트 상황 가중치를 적용한다', () => {
      expect(
        caclulationSituationScoreTest(
          'date',
          createSummary({
            atmosphereScore: 80,
            tasteScore: 60,
            quietScore: 40,
            speedScore: 20,
          }),
        ),
      ).toBe(63)
    })
  })

  describe('가성비 좋은 장소 상황', () => {
    it.each([
      [{ valueScore: 100 }, 60],
      [{ tasteScore: 100 }, 30],
      [{ speedScore: 100 }, 10],
      [{ atmosphereScore: 100, quietScore: 100 }, 0],
    ] as const)('입력 %o이면 %i를 반환한다', (scores, expected) => {
      expect(
        caclulationSituationScoreTest('valueMeal', createSummary(scores)),
      ).toBe(expected)
    })

    it('여러 평가 점수에 가성비 상황 가중치를 적용한다', () => {
      expect(
        caclulationSituationScoreTest(
          'valueMeal',
          createSummary({ valueScore: 80, tasteScore: 60, speedScore: 40 }),
        ),
      ).toBe(70)
    })
  })

  describe('기다림이 적은 장소 상황', () => {
    it.each([
      [{ speedScore: 100 }, 70],
      [{ tasteScore: 100 }, 15],
      [{ valueScore: 100 }, 15],
      [{ atmosphereScore: 100, quietScore: 100 }, 0],
    ] as const)('입력 %o이면 %i를 반환한다', (scores, expected) => {
      expect(
        caclulationSituationScoreTest('quickMeal', createSummary(scores)),
      ).toBe(expected)
    })

    it('여러 평가 점수에 빠른 식사 상황 가중치를 적용한다', () => {
      expect(
        caclulationSituationScoreTest(
          'quickMeal',
          createSummary({ speedScore: 80, tasteScore: 60, valueScore: 40 }),
        ),
      ).toBe(71)
    })
  })

  describe('반올림', () => {
    it.each([
      ['study', { quietScore: 1 }, 1],
      ['study', { speedScore: 4 }, 0],
      ['date', { atmosphereScore: 1 }, 1],
      ['quickMeal', { tasteScore: 3 }, 0],
      ['quickMeal', { tasteScore: 4 }, 1],
    ] as const)('%s 상황의 입력 %o를 %i로 반올림한다', (situation, scores, expected) => {
      expect(
        caclulationSituationScoreTest(situation, createSummary(scores)),
      ).toBe(expected)
    })
  })

  describe('계산에 사용하지 않는 부가 정보', () => {
    const scoreInput = {
      quietScore: 100,
      atmosphereScore: 80,
      valueScore: 60,
      speedScore: 40,
    }

    it.each([
      { reviewCount: 999 },
      { rating: 4.8 },
      { ratingDataCount: 999 },
      { kakaoPlaceId: 'another-place' },
    ])('부가 정보 %o가 결과에 영향을 주지 않는다', (metadata) => {
      expect(
        caclulationSituationScoreTest(
          'study',
          createSummary({ ...scoreInput, ...metadata }),
        ),
      ).toBe(84)
    })
  })
})
