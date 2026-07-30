import { getSupabase } from "./supabaseClient.js"
import { ensureArticle } from "./articleStore.js"

// 사용자의 투자 판단 히스토리를 최신순으로 조회한다. articles와 join해
// 저장 당시의 기사 제목/URL을 복원한다(client/src/pages/InsightNote.jsx가
// 기대하는 title/url 필드 형태를 그대로 유지).
export async function readDecisions(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("decisions")
    .select("id, decision, market_sentiment, insight, summary_bullets, memo, created_at, articles(title, url)")
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
    memo: row.memo ?? null,
    createdAt: row.created_at,
  }))
}

export async function appendDecision(
  userId,
  { url, title, summaryBullets, decision, marketSentiment, insight, memo },
) {
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
      memo: memo ?? null,
    })
    .select("id, decision, market_sentiment, insight, summary_bullets, memo, created_at")
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
    memo: saved.memo ?? null,
    createdAt: saved.created_at,
  }
}

// 메모 수정 전용 — 재판단(insert) 경로와 완전히 분리해 인사이트 노트 카드가
// 중복 생성되지 않게 한다. 서버는 SUPABASE_SERVICE_ROLE_KEY로 접속해 RLS를
// 우회하므로, 소유권 검증은 여기 .eq("user_id", userId)가 담당한다 — 빠뜨리면
// 타인의 decision id로 메모를 바꿀 수 있는 IDOR이 된다.
export async function updateDecisionMemo(userId, id, memo) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("decisions")
    .update({ memo: memo ?? null })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, memo")
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// 인사이트 노트 카드 삭제. vocabularyStore.js의 deleteVocabularyTerms와 동일한
// 이유로 .eq("user_id", userId)가 소유권 검증의 유일한 방어선이다(서버는
// SUPABASE_SERVICE_ROLE_KEY로 접속해 RLS를 우회하므로 빠뜨리면 IDOR).
export async function deleteDecisions(userId, ids) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("decisions")
    .delete()
    .in("id", ids)
    .eq("user_id", userId)
    .select("id")

  if (error) throw new Error(error.message)
  return data
}
