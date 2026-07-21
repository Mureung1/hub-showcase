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

export function calculateSituationScore(
  situation: RecommendationSituation,
  summary: StoreReviewSummary,
) {
  const score = Object.entries(SITUATION_WEIGHTS[situation]).reduce(
    (total, [field, weight]) =>
      total + Number(summary[field as keyof StoreReviewSummary]) * weight,
    0,
  )
  return Math.round(score)
}
