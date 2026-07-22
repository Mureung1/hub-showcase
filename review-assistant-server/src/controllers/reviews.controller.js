import { ApiError } from '../middleware/errorHandler.js'
import { analyzeReviews as analyzeReviewsText } from '../services/reviews.service.js'
import {
  saveAnalyzedReviews,
  getRecurringIssues,
  resetHistory as clearHistory,
  getReviewsByUser,
} from '../services/history.service.js'

const MAX_REVIEWS = 15

function validateReviews(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    throw new ApiError(400, 'EMPTY_INPUT', '리뷰를 먼저 입력해주세요.')
  }
  const valid = reviews.map((r) => String(r).trim()).filter(Boolean)
  if (valid.length === 0) {
    throw new ApiError(400, 'NO_VALID_REVIEW', '유효한 리뷰가 없어요.')
  }
  if (valid.length > MAX_REVIEWS) {
    throw new ApiError(400, 'TOO_MANY_REVIEWS', '한 번에 최대 15개까지 분석할 수 있어요.')
  }
  return valid
}

export async function analyzeReviews(req, res) {
  const reviews = validateReviews(req.body?.reviews)
  const results = await analyzeReviewsText(reviews)
  await saveAnalyzedReviews(req.sessionId, results, req.user?.id ?? null)
  const recurringIssues = await getRecurringIssues(req.sessionId)
  res.json({ results, recurringIssues })
}

export async function resetHistory(req, res) {
  await clearHistory(req.sessionId)
  res.status(204).end()
}

export async function myReviews(req, res) {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요해요.')
  }
  res.json({ reviews: await getReviewsByUser(req.user.id) })
}
