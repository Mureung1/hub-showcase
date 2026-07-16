import {
  REVIEW_CATEGORIES,
  type Review,
  type ReviewCategory,
  type TastePriorities,
} from '../../types/review'

const PRIORITY_WEIGHTS = [5, 3, 1] as const

export function calculateAdjustedApprovalRate(
  category: ReviewCategory,
  reviews: readonly Review[],
) {
  const approvalCount = reviews.reduce(
    (count, review) =>
      count + (review.likedCategories.includes(category) ? 1 : 0),
    0,
  )

  return (approvalCount + 5) / (reviews.length + 10)
}

export function calculateCategoryApprovalRates(reviews: readonly Review[]) {
  return Object.fromEntries(
    REVIEW_CATEGORIES.map((category) => [
      category,
      calculateAdjustedApprovalRate(category, reviews),
    ]),
  ) as Record<ReviewCategory, number>
}

export function calculateRecommendationScore(
  priorities: TastePriorities,
  reviews: readonly Review[],
) {
  const approvalRates = calculateCategoryApprovalRates(reviews)
  const weightedScore = priorities.reduce(
    (score, category, index) =>
      score + approvalRates[category] * PRIORITY_WEIGHTS[index],
    0,
  )
  const appliedWeight = priorities.reduce(
    (weight, _category, index) => weight + PRIORITY_WEIGHTS[index],
    0,
  )

  return (weightedScore / appliedWeight) * 100
}
