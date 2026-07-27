// 추천 생성 오케스트레이션: 24h lazy 게이트 → 위기 분기 → 캐시 히트 → 1단계 후보 축소 →
// 2단계 AI 선택 → 원자적 저장. 이 파일이 추천 흐름 전체를 조립하는 유일한 진입점이다.
import { prisma } from '../lib/prisma.js'
import { findCandidates } from './candidateFinder.js'
import {
  findActiveMatch,
  createMatchAtomic,
  dismissActive,
  countRecentMatchesForUser,
  countRecentRefreshesForUser,
} from './matchesService.js'
import { callAiModel } from '../lib/aiClient.js'
import { serializeMatch } from '../lib/serializeMatch.js'
import { buildMatchPrompt, MATCH_PROMPT_VERSION } from '../prompts/matchPrompt.js'
import { CRISIS_SUPPORT_MESSAGE, CRISIS_RESOURCES } from '../config/crisisResources.js'
import {
  SOURCE_READY_DELAY_HOURS,
  CANDIDATE_LIMIT,
  RECOMMENDATION_PER_HOUR,
  REFRESH_PER_DAY,
} from '../config/matchingConfig.js'

const DEFAULT_REASON_TEMPLATE = '두 분의 편지에서 비슷한 감정의 결이 느껴져서 연결해드렸어요.'

export class RateLimitError extends Error {
  constructor(message) {
    super(message)
    this.name = 'RateLimitError'
  }
}

function hoursSince(date) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60)
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function assertRecommendationRateLimit(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const count = await countRecentMatchesForUser(userId, oneHourAgo)
  if (count >= RECOMMENDATION_PER_HOUR) {
    throw new RateLimitError('추천 요청이 너무 많아요. 잠시 후 다시 시도해주세요.')
  }
}

async function assertRefreshRateLimit(userId) {
  const count = await countRecentRefreshesForUser(userId, startOfToday())
  if (count >= REFRESH_PER_DAY) {
    throw new RateLimitError('오늘 새로고침할 수 있는 횟수를 다 쓰셨어요. 내일 다시 시도해주세요.')
  }
}

// 기준 편지가 존재하고 / 24h가 지났고 / 태깅이 끝난 상태인지 한 번에 확인한다.
// (태깅이 pending/failed면 primaryEmotion이 null이라 findCandidates가 DB 쿼리 단계에서
// 깨진다 — 여기서 미리 걸러서 500 대신 이해할 수 있는 응답을 돌려준다.)
async function loadReadySourceLetter(sourceLetterId) {
  const sourceLetter = await prisma.letter.findUnique({ where: { id: sourceLetterId } })
  if (!sourceLetter) {
    return { error: { has_match: false, reason_code: 'not_found' } }
  }
  if (hoursSince(sourceLetter.createdAt) < SOURCE_READY_DELAY_HOURS) {
    return { error: { has_match: false, reason_code: 'not_ready' } }
  }
  if (sourceLetter.taggingStatus !== 'done') {
    return { error: { has_match: false, reason_code: 'tagging_pending' } }
  }
  return { sourceLetter }
}

function crisisResponse() {
  return {
    has_match: false,
    reason_code: 'support_needed',
    support_message: CRISIS_SUPPORT_MESSAGE,
    resources: CRISIS_RESOURCES,
  }
}

async function selectAndReason({ sourceLetter, candidates }) {
  if (candidates.length === 1) {
    return { selected: candidates[0], reason: DEFAULT_REASON_TEMPLATE }
  }

  const attempt = async () => {
    const { system, user } = buildMatchPrompt({ sourceLetter, candidates })
    const response = await callAiModel({ purpose: 'select', system, user })
    return { response, selected: candidates.find((c) => c.id === response.selected_id) }
  }

  let { response, selected } = await attempt()
  if (!selected) {
    ;({ response, selected } = await attempt())
  }

  // 후처리 실패(selected_id가 후보 목록에 없음, 2회 모두) — 1단계 1순위 + 기본 템플릿으로 폴백
  if (!selected) {
    return { selected: candidates[0], reason: DEFAULT_REASON_TEMPLATE }
  }

  return { selected, reason: response.reason }
}

async function generateNewRecommendation(sourceLetter) {
  const { crisis, candidates, snapshot } = await findCandidates(sourceLetter, CANDIDATE_LIMIT)

  if (crisis) {
    return crisisResponse()
  }

  console.log(
    `[recommendationService] sourceLetterId=${sourceLetter.id} candidateCount=${candidates.length} ` +
      `relaxation=${snapshot.relaxation.join(',') || 'none'}`,
  )

  if (candidates.length === 0) {
    return { has_match: false, reason_code: 'no_candidates' }
  }

  const { selected, reason } = await selectAndReason({ sourceLetter, candidates })

  const result = await createMatchAtomic({
    sourceLetterId: sourceLetter.id,
    matchedLetterId: selected.id,
    reason,
    candidateCount: candidates.length,
    candidateSnapshot: snapshot,
    matchPromptVersion: MATCH_PROMPT_VERSION,
    effectiveExposureCap: snapshot.effectiveExposureCap,
  })

  if (result.conflict) {
    return result.winner ? serializeMatch(result.winner) : { has_match: false, reason_code: 'no_candidates' }
  }

  if (result.saturated) {
    // 선택된 후보가 그 사이 노출 캡을 채움(동시 요청 경쟁) — 이번 요청은 "아직 못 찾음"으로
    // 처리한다. 다음 요청에서 findCandidates가 그 후보를 자연히 제외하고 다시 계산한다.
    return { has_match: false, reason_code: 'no_candidates' }
  }

  return serializeMatch(result.match)
}

// GET .../current 용 — 부수효과 없음, AI 호출 없음.
export async function getCurrentRecommendation(sourceLetterId) {
  const cached = await findActiveMatch(sourceLetterId)
  return cached ? serializeMatch(cached) : { has_match: false }
}

// POST .../recommendations 용 — 유효 캐시가 있으면 그걸 반환(멱등), 없으면 새로 생성.
export async function getOrCreateRecommendation(sourceLetterId) {
  const { sourceLetter, error } = await loadReadySourceLetter(sourceLetterId)
  if (error) return error

  if (sourceLetter.riskFlag) {
    console.error('[recommendationService] 위기 신호 편지 — 관리자 확인 필요:', {
      letterId: sourceLetter.id,
      authorId: sourceLetter.authorId,
    })
    return crisisResponse()
  }

  const cached = await findActiveMatch(sourceLetterId)
  if (cached) {
    return serializeMatch(cached)
  }

  // 캐시 히트는 레이트리밋과 무관(AI 호출이 없으므로) — 새로 생성할 때만 체크한다.
  await assertRecommendationRateLimit(sourceLetter.authorId)
  return generateNewRecommendation(sourceLetter)
}

// POST .../recommendations/refresh 용 — 기존 활성 추천을 dismiss하고 새로 생성.
export async function refreshRecommendation(sourceLetterId) {
  const { sourceLetter, error } = await loadReadySourceLetter(sourceLetterId)
  if (error) return error

  await assertRefreshRateLimit(sourceLetter.authorId)
  await dismissActive(sourceLetterId)
  return generateNewRecommendation(sourceLetter)
}
