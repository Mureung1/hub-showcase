import { getSupabase } from "./supabaseClient.js"
import { ensureArticle } from "./articleStore.js"

// 완독(읽기 완료) 이벤트를 기록한다. decisionId가 있으면 판단으로 이어진
// 완독으로 FK 연결하고, 없으면 판단 없이 이탈한 완독으로 기록한다(기능③
// 정책 — "판단 없이 뒤로가기/이탈해도 읽기 완료로 인정").
export async function appendArticleRead(userId, { url, title, decisionId }) {
  const supabase = getSupabase()
  const article = await ensureArticle(title, url)

  const { data: saved, error } = await supabase
    .from("article_reads")
    .insert({
      user_id: userId,
      article_id: article.id,
      decision_id: decisionId ?? null,
    })
    .select("id, completed_at, decision_id")
    .single()

  if (error) throw new Error(error.message)

  return { id: saved.id, completedAt: saved.completed_at, decisionId: saved.decision_id }
}
