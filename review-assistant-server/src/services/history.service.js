import { db } from '../db/db.js'
import { suggestionForKeyword } from './reviews.service.js'

const RECURRING_THRESHOLD = 2

const insertStmt = db.prepare(`
  INSERT INTO reviews (session_id, original_text, sentiment, keywords, score, user_id)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const negativeReviewsStmt = db.prepare(`
  SELECT keywords FROM reviews WHERE session_id = ? AND sentiment = 'negative'
`)

const deleteHistoryStmt = db.prepare(`DELETE FROM reviews WHERE session_id = ?`)

const reviewsByUserStmt = db.prepare(`
  SELECT original_text, sentiment, keywords, score, created_at
  FROM reviews WHERE user_id = ? ORDER BY created_at DESC
`)

// userId는 로그인 상태일 때만 채워진다(optionalAuth 미들웨어) — 비로그인 사용자는 그대로 null.
export function saveAnalyzedReviews(sessionId, results, userId = null) {
  for (const result of results) {
    insertStmt.run(sessionId, result.originalText, result.sentiment, JSON.stringify(result.keywords), result.score, userId)
  }
}

// 로그인 계정에 연결된 리뷰 전체 — "내 리뷰 모아보기"용. session_id와 무관하게 이 계정으로
// 분석했던 모든 리뷰를 기기/세션 상관없이 모아서 보여준다.
export function getReviewsByUser(userId) {
  return reviewsByUserStmt.all(userId).map((row) => ({
    originalText: row.original_text,
    sentiment: row.sentiment,
    keywords: JSON.parse(row.keywords),
    score: row.score,
    createdAt: row.created_at,
  }))
}

export function getRecurringIssues(sessionId) {
  const rows = negativeReviewsStmt.all(sessionId)

  const counts = {}
  for (const row of rows) {
    const keywords = JSON.parse(row.keywords)
    for (const keyword of keywords) {
      counts[keyword] = (counts[keyword] || 0) + 1
    }
  }

  return Object.entries(counts)
    .filter(([, count]) => count >= RECURRING_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, occurrenceCount]) => ({
      keyword,
      occurrenceCount,
      suggestion: suggestionForKeyword(keyword),
    }))
}

export function resetHistory(sessionId) {
  deleteHistoryStmt.run(sessionId)
}
