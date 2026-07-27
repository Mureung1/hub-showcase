import { supabase } from '../db/supabaseClient.js'
import { suggestionForKeyword, sanitizeKeywords } from './reviews.service.js'
import { countKeywords } from './stats.service.js'

const RECURRING_THRESHOLD = 2

// userId는 로그인 상태일 때만 채워진다(optionalAuth 미들웨어) — 비로그인 사용자는 그대로 null.
export async function saveAnalyzedReviews(sessionId, results, userId = null) {
  const rows = results.map((result) => ({
    session_id: sessionId,
    original_text: result.originalText,
    sentiment: result.sentiment,
    keywords: result.keywords,
    score: result.score,
    user_id: userId,
  }))

  const { error } = await supabase.from('reviews').insert(rows)
  if (error) throw new Error(`리뷰 저장 실패: ${error.message}`)
}

// 로그인 계정에 연결된 리뷰 전체 — "내 리뷰 모아보기"용. session_id와 무관하게 이 계정으로
// 분석했던 모든 리뷰를 기기/세션 상관없이 모아서 보여준다.
export async function getReviewsByUser(userId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('original_text, sentiment, keywords, score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`리뷰 조회 실패: ${error.message}`)

  return data.map((row) => ({
    originalText: row.original_text,
    sentiment: row.sentiment,
    keywords: sanitizeKeywords(row.keywords),
    score: row.score,
    createdAt: row.created_at,
  }))
}

export async function getRecurringIssues(sessionId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('keywords')
    .eq('session_id', sessionId)
    .eq('sentiment', 'negative')

  if (error) throw new Error(`반복 문제 조회 실패: ${error.message}`)

  return Object.entries(countKeywords(data))
    .filter(([, count]) => count >= RECURRING_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, occurrenceCount]) => ({
      keyword,
      occurrenceCount,
      suggestion: suggestionForKeyword(keyword),
    }))
}

export async function resetHistory(sessionId) {
  const { error } = await supabase.from('reviews').delete().eq('session_id', sessionId)
  if (error) throw new Error(`기록 초기화 실패: ${error.message}`)
}
