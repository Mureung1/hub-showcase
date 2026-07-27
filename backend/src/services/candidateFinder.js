// 1단계 후보 축소 (AI 없음). 나중에 임베딩 검색으로 통째 교체할 수 있도록
// findCandidates(sourceLetter, limit) 인터페이스만 노출한다.
//
// 구조: 감정 티어(주감정 일치/인접) + 제외조건 필터는 Prisma 쿼리(SQL)로 처리하고,
// content_score 계산과 티어 정렬은 JS에서 한다. 10만 건 규모에서 배열 겹침 연산을
// SQL로 전부 하면 비싸지기 때문에, SQL은 인덱스를 타는 감정 필터로 넉넉히 추리기만 하고
// 나머지는 애플리케이션 레이어에서 처리한다 (계획서 17번 성능 검토 참고).
import { prisma } from '../lib/prisma.js'
import { EMOTION_ADJACENCY } from '../config/emotions.js'
import {
  CANDIDATE_LIMIT,
  MIN_CANDIDATES_BEFORE_RELAX,
  CONTENT_SCORE_WEIGHTS,
  EXPOSURE_CAP_N,
} from '../config/matchingConfig.js'

// SQL에서 넉넉하게 가져올 내부 상한. 여기서 골라낸 뒤 JS에서 최종 limit만큼 자른다.
const INNER_FETCH_LIMIT = 300

export const CRISIS_SENTINEL = { crisis: true, candidates: [], snapshot: null }

function tierOf(source, candidate) {
  if (candidate.primaryEmotion === source.primaryEmotion) return 1
  if (EMOTION_ADJACENCY[source.primaryEmotion]?.includes(candidate.primaryEmotion)) return 2
  return null
}

function overlapCount(a, b) {
  const setB = new Set(b)
  return a.filter((item) => setB.has(item)).length
}

function contentScore(source, candidate) {
  const secondaryOverlap = overlapCount(source.secondaryEmotions, candidate.secondaryEmotions)
  const keywordOverlap = overlapCount(source.keywordsNorm, candidate.keywordsNorm)
  return (
    secondaryOverlap * CONTENT_SCORE_WEIGHTS.secondaryEmotion +
    keywordOverlap * CONTENT_SCORE_WEIGHTS.keyword
  )
}

function baseWhere(source, exposureCap) {
  return {
    id: { not: source.id },
    authorId: { not: source.authorId },
    taggingStatus: 'done',
    isMatchable: true,
    ...(exposureCap != null ? { matchExposureCount: { lt: exposureCap } } : {}),
    matchesAsTarget: { none: { sourceLetterId: source.id } },
  }
}

async function fetchPool({ source, tierEmotions, exposureCap }) {
  return prisma.letter.findMany({
    where: { ...baseWhere(source, exposureCap), primaryEmotion: { in: tierEmotions } },
    orderBy: { createdAt: 'desc' },
    take: INNER_FETCH_LIMIT,
  })
}

// Tier3 완화용 — primaryEmotion 제약을 아예 빼서, 감정 티어 밖이지만 부감정이 겹치는
// 편지까지 후보 풀에 들어올 수 있게 한다(fetchPool은 SQL 단계에서 이미 걸러버리기 때문에
// Tier3 후보가 애초에 pool에 없는 문제를 막기 위함).
async function fetchBroadPool({ source, exposureCap }) {
  return prisma.letter.findMany({
    where: baseWhere(source, exposureCap),
    orderBy: { createdAt: 'desc' },
    take: INNER_FETCH_LIMIT,
  })
}

function rankAndTrim(source, pool, limit) {
  return pool
    .map((candidate) => ({ candidate, tier: tierOf(source, candidate), score: contentScore(source, candidate) }))
    .filter((entry) => entry.tier != null)
    .sort((a, b) => a.tier - b.tier || b.score - a.score || b.candidate.createdAt - a.candidate.createdAt)
    .slice(0, limit)
}

// Tier1/2 밖이지만 부감정이 하나라도 겹치는 편지 — 후보 부족 시 완화 3단계에서만 편입한다.
function findTier3(source, pool) {
  return pool
    .filter((candidate) => tierOf(source, candidate) == null)
    .filter((candidate) => overlapCount(source.secondaryEmotions, candidate.secondaryEmotions) > 0)
    .map((candidate) => ({ candidate, tier: 3, score: contentScore(source, candidate) }))
    .sort((a, b) => b.score - a.score || b.candidate.createdAt - a.candidate.createdAt)
}

export async function findCandidates(sourceLetter, limit = CANDIDATE_LIMIT) {
  // 기준 편지 본인이 위기 신호면 1단계 자체를 실행하지 않는다.
  if (sourceLetter.riskFlag) {
    return CRISIS_SENTINEL
  }

  const tierEmotions = [
    sourceLetter.primaryEmotion,
    ...(EMOTION_ADJACENCY[sourceLetter.primaryEmotion] ?? []),
  ]

  const snapshot = { relaxation: [] }

  let pool = await fetchPool({ source: sourceLetter, tierEmotions, exposureCap: EXPOSURE_CAP_N })
  let ranked = rankAndTrim(sourceLetter, pool, limit)

  // 완화 1단계: match_exposure_count 상한 일시 해제
  if (ranked.length < MIN_CANDIDATES_BEFORE_RELAX) {
    snapshot.relaxation.push('exposure_cap_lifted')
    pool = await fetchPool({ source: sourceLetter, tierEmotions, exposureCap: null })
    ranked = rankAndTrim(sourceLetter, pool, limit)
  }

  // 완화 2단계: 부감정끼리 겹치는 편지를 Tier3으로 추가 편입.
  // Tier1/2 풀은 primaryEmotion으로 이미 필터링돼 있어 Tier3 후보가 아예 없을 수 있으므로,
  // primaryEmotion 제약이 없는 넓은 풀을 다시 가져와서 찾는다.
  if (ranked.length < MIN_CANDIDATES_BEFORE_RELAX) {
    snapshot.relaxation.push('tier3_secondary_overlap_added')
    const broadPool = await fetchBroadPool({ source: sourceLetter, exposureCap: null })
    ranked = [...ranked, ...findTier3(sourceLetter, broadPool)].slice(0, limit)
  }

  // 노출캡 완화가 발동했으면, 이후 저장 단계(원자적 증가)에서도 같은 기준을 써야
  // 방금 완화로 골라낸 후보가 캡 검사에서 다시 튕겨나가지 않는다.
  snapshot.effectiveExposureCap = snapshot.relaxation.includes('exposure_cap_lifted') ? null : EXPOSURE_CAP_N
  snapshot.candidateCount = ranked.length
  snapshot.tierCounts = ranked.reduce((acc, r) => {
    acc[r.tier] = (acc[r.tier] ?? 0) + 1
    return acc
  }, {})
  snapshot.ranked = ranked.map((r) => ({ id: r.candidate.id, tier: r.tier, score: r.score }))

  return {
    crisis: false,
    candidates: ranked.map((r) => r.candidate),
    snapshot,
  }
}
