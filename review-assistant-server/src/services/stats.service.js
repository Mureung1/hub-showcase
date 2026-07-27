import { supabase } from '../db/supabaseClient.js'
import { sanitizeKeywords } from './reviews.service.js'

const TOP_KEYWORDS_LIMIT = 5

async function fetchRows(sessionId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('sentiment, keywords, score, created_at')
    .eq('session_id', sessionId)

  if (error) throw new Error(`통계 조회 실패: ${error.message}`)
  return data
}

// 리뷰 row 배열의 keywords 필드를 세는 로직 — getSummary(전체 top 5)와
// history.service.js의 getRecurringIssues(임계값 필터)가 동일하게 재사용한다.
// sanitizeKeywords를 여기서도 거치는 이유: keywords enum 가드(#39)는 분석 시점부터
// 저장되는 데이터만 정리하므로, 가드 도입 이전에 이미 스키마 밖 값으로 저장된
// 레거시 row를 집계할 때도 안전하게 걸러내기 위함(#41 재검증 중 발견).
export function countKeywords(rows) {
  const counts = {}
  for (const row of rows) {
    for (const keyword of sanitizeKeywords(row.keywords)) {
      counts[keyword] = (counts[keyword] || 0) + 1
    }
  }
  return counts
}

export async function getSummary(sessionId) {
  const rows = await fetchRows(sessionId)

  const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 }
  let scoreSum = 0

  for (const row of rows) {
    sentimentBreakdown[row.sentiment] += 1
    scoreSum += row.score
  }

  const topKeywords = Object.entries(countKeywords(rows))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_KEYWORDS_LIMIT)
    .map(([keyword, count]) => ({ keyword, count }))

  return {
    totalReviews: rows.length,
    sentimentBreakdown,
    averageScore: rows.length > 0 ? Math.round(scoreSum / rows.length) : 0,
    topKeywords,
  }
}

export async function getMonthlyStats(sessionId) {
  const rows = await fetchRows(sessionId)

  const months = {}
  for (const row of rows) {
    const month = row.created_at.slice(0, 7)
    if (!months[month]) {
      months[month] = { month, totalReviews: 0, positive: 0, negative: 0, neutral: 0, scoreSum: 0 }
    }
    months[month].totalReviews += 1
    months[month][row.sentiment] += 1
    months[month].scoreSum += row.score
  }

  return Object.values(months)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ scoreSum, totalReviews, ...rest }) => ({
      ...rest,
      totalReviews,
      averageScore: totalReviews > 0 ? Math.round(scoreSum / totalReviews) : 0,
    }))
}
