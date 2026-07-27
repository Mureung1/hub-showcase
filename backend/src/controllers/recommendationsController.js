// /api/letters/:id/recommendations 라우트의 요청/응답 처리.
// 세 엔드포인트 모두 먼저 이 편지가 호출자 소유인지 확인한다(다른 사람 편지 id로 추천을 캐서는 안 됨).
import { getLetterById } from '../services/lettersService.js'
import {
  getCurrentRecommendation,
  getOrCreateRecommendation,
  refreshRecommendation,
  RateLimitError,
} from '../services/recommendationService.js'

async function findOwnedLetter(req) {
  return getLetterById(req.params.id, req.userId)
}

function handleError(err, res, next) {
  if (err instanceof RateLimitError) {
    return res.status(429).json({ error: err.message })
  }
  next(err)
}

// GET .../current — 부수효과 없음, AI 호출 없음. 화면 진입 시 먼저 이걸 호출한다.
export async function getCurrent(req, res, next) {
  try {
    const letter = await findOwnedLetter(req)
    if (!letter) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    res.json(await getCurrentRecommendation(letter.id))
  } catch (err) {
    next(err)
  }
}

// POST .../recommendations — 유효 캐시가 있으면 그걸 반환(멱등), 없으면 새로 생성.
export async function postRecommendation(req, res, next) {
  try {
    const letter = await findOwnedLetter(req)
    if (!letter) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    res.json(await getOrCreateRecommendation(letter.id))
  } catch (err) {
    handleError(err, res, next)
  }
}

// POST .../refresh — 기존 추천을 dismiss하고 새로 생성.
export async function postRefresh(req, res, next) {
  try {
    const letter = await findOwnedLetter(req)
    if (!letter) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    res.json(await refreshRecommendation(letter.id))
  } catch (err) {
    handleError(err, res, next)
  }
}
