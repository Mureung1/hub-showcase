import { getSupabase } from "./supabaseClient.js"
import { ensureArticle } from "./articleStore.js"

// 사용자의 투자 판단 히스토리를 최신순으로 조회한다. articles와 join해
// 저장 당시의 기사 제목/URL을 복원한다(client/src/pages/InsightNote.jsx가
// 기대하는 title/url 필드 형태를 그대로 유지).
export async function readDecisions(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("decisions")
    .select("id, decision, market_sentiment, insight, summary_bullets, created_at, articles(title, url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return data.map((row) => ({
    id: row.id,
    url: row.articles.url,
    title: row.articles.title,
    summaryBullets: row.summary_bullets ?? [],
    decision: row.decision,
    marketSentiment: row.market_sentiment,
    insight: row.insight,
    createdAt: row.created_at,
  }))
}

export async function appendDecision(userId, { url, title, summaryBullets, decision, marketSentiment, insight }) {
  const supabase = getSupabase()
  const article = await ensureArticle(title, url)

  const { data: saved, error } = await supabase
    .from("decisions")
    .insert({
      user_id: userId,
      article_id: article.id,
      summary_bullets: summaryBullets ?? [],
      decision,
      market_sentiment: marketSentiment ?? null,
      insight: insight ?? null,
    })
    .select("id, decision, market_sentiment, insight, summary_bullets, created_at")
    .single()

  if (error) throw new Error(error.message)

  return {
    id: saved.id,
    url,
    title,
    summaryBullets: saved.summary_bullets ?? [],
    decision: saved.decision,
    marketSentiment: saved.market_sentiment,
    insight: saved.insight,
    createdAt: saved.created_at,
  }
}
