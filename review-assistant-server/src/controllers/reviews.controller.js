import { ApiError } from '../middleware/errorHandler.js'

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

// TODO(2주차): 실제 분석 엔진 연결. 기획서.md 5번 섹션(API 설계)의 응답 스펙을 따를 것.
// 프론트엔드(review-assistant-react/src/App.jsx)의 규칙 기반 로직을 참고해 이식하거나,
// Claude API 호출로 교체한다 (백엔드에서만 ANTHROPIC_API_KEY 사용, 프론트엔드에 노출 금지).
export function analyzeReviews(req) {
  const reviews = validateReviews(req.body?.reviews)
  throw new ApiError(501, 'NOT_IMPLEMENTED', `분석 엔진 미구현 (2주차 예정) — ${reviews.length}건 접수됨`)
}

// TODO(2주차): 세션별 누적 히스토리 저장소 연결 후 실제로 초기화.
export function resetHistory(req, res) {
  res.status(204).end()
}
