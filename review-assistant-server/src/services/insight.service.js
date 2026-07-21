import { db } from '../db/db.js'
import { getSummary } from './stats.service.js'
import { getRecurringIssues } from './history.service.js'
import { callClaudeTool } from './claude.client.js'

const findCacheStmt = db.prepare(`
  SELECT insight_text, generated_at FROM dashboard_insights WHERE session_id = ?
`)
const upsertCacheStmt = db.prepare(`
  INSERT OR REPLACE INTO dashboard_insights (session_id, insight_text, generated_at)
  VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
`)

const INSIGHT_TOOL = {
  name: 'submit_dashboard_insight',
  description: '리뷰 통계를 바탕으로 사장님에게 도움이 될 한두 문장짜리 인사이트를 제출한다',
  input_schema: {
    type: 'object',
    properties: {
      insight: { type: 'string' },
    },
    required: ['insight'],
  },
}

function isToday(isoString) {
  const today = new Date().toISOString().slice(0, 10)
  return isoString.slice(0, 10) === today
}

function buildPrompt(summary, recurringIssues) {
  const keywordsText = summary.topKeywords.map((k) => `${k.keyword} ${k.count}건`).join(', ') || '없음'
  const recurringText =
    recurringIssues.map((r) => `${r.keyword}(${r.occurrenceCount}건)`).join(', ') || '없음'

  return [
    '아래는 한 소상공인 매장의 리뷰 분석 통계다. 사장님이 바로 이해할 수 있는 한두 문장짜리 한국어 인사이트를 만들어줘.',
    '구체적인 수치나 키워드를 언급하고, 실행 가능한 제안이 있으면 짧게 포함해줘. 너무 길게 쓰지 마.',
    '',
    `총 분석 리뷰 수: ${summary.totalReviews}건`,
    `감정 분포: 긍정 ${summary.sentimentBreakdown.positive} / 중립 ${summary.sentimentBreakdown.neutral} / 부정 ${summary.sentimentBreakdown.negative}`,
    `평균 관심도 점수: ${summary.averageScore}`,
    `자주 언급된 키워드: ${keywordsText}`,
    `반복되는 문제: ${recurringText}`,
  ].join('\n')
}

// session_id당 하루 1건만 생성해서 캐싱한다 — 대시보드를 열 때마다 API를 부르면
// 느려지고 비용도 쌓이기 때문(기획서.md 참고 없음, 오늘 대화에서 결정).
export async function getOrGenerateInsight(sessionId) {
  const summary = getSummary(sessionId)
  if (summary.totalReviews === 0) {
    return null
  }

  const cached = findCacheStmt.get(sessionId)
  if (cached && isToday(cached.generated_at)) {
    return cached.insight_text
  }

  const recurringIssues = getRecurringIssues(sessionId)
  const { insight } = await callClaudeTool({
    tool: INSIGHT_TOOL,
    userMessage: buildPrompt(summary, recurringIssues),
  })

  upsertCacheStmt.run(sessionId, insight)
  return insight
}
