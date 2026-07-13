import { db } from '../db/db.js'
import { suggestionForKeyword } from './reviews.service.js'

const RECURRING_THRESHOLD = 2

const insertStmt = db.prepare(`
  INSERT INTO reviews (session_id, original_text, sentiment, keywords, score)
  VALUES (?, ?, ?, ?, ?)
`)

const negativeReviewsStmt = db.prepare(`
  SELECT keywords FROM reviews WHERE session_id = ? AND sentiment = 'negative'
`)

const deleteHistoryStmt = db.prepare(`DELETE FROM reviews WHERE session_id = ?`)

export function saveAnalyzedReviews(sessionId, results) {
  for (const result of results) {
    insertStmt.run(sessionId, result.originalText, result.sentiment, JSON.stringify(result.keywords), result.score)
  }
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
