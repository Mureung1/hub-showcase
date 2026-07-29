import { supabase } from '../db/supabaseClient.js'
import { getSummary } from './stats.service.js'
import { getRecurringIssues } from './history.service.js'
import { callClaudeTool } from './claude.client.js'

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

// 캐시 생성 시점 이후로 새로 분석된 리뷰가 있는지 확인한다 — 있으면 통계가 바뀐 것이므로
// 캐시를 무효화한다. 리뷰 건수가 그대로여도(초기화 후 재분석 등) created_at은 항상 더
// 나중이 되므로 정확히 감지된다.
async function hasNewReviewsSince(sessionId, generatedAt) {
  const { count, error } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .gt('created_at', generatedAt)
  if (error) throw new Error(`신규 리뷰 확인 실패: ${error.message}`)
  return count > 0
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

// session_id당 캐싱해서 대시보드를 열 때마다 API를 새로 부르지 않는다 — 다만
// 캐시 생성 이후 새로 분석된 리뷰가 있으면(통계가 바뀐 것이므로) 다시 생성한다.
// (기존엔 "하루 1건" 기준이었는데, 같은 날 리뷰를 더 분석해도 캐시된 옛 문구가
// 그대로 나와 화면의 실시간 통계와 안 맞아 보이는 문제가 있어 변경함 — 2026-07-29.)
export async function getOrGenerateInsight(sessionId) {
  const summary = await getSummary(sessionId)
  if (summary.totalReviews === 0) {
    return null
  }

  const { data: cached, error: findError } = await supabase
    .from('dashboard_insights')
    .select('insight_text, generated_at')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (findError) throw new Error(`인사이트 캐시 조회 실패: ${findError.message}`)

  if (cached && !(await hasNewReviewsSince(sessionId, cached.generated_at))) {
    return cached.insight_text
  }

  const recurringIssues = await getRecurringIssues(sessionId)
  const { insight } = await callClaudeTool({
    tool: INSIGHT_TOOL,
    userMessage: buildPrompt(summary, recurringIssues),
  })

  const { error: upsertError } = await supabase
    .from('dashboard_insights')
    .upsert({ session_id: sessionId, insight_text: insight, generated_at: new Date().toISOString() })
  if (upsertError) throw new Error(`인사이트 캐시 저장 실패: ${upsertError.message}`)

  return insight
}
