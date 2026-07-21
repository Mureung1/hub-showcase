import { getSupabase } from "./supabaseClient.js"
import { ensureArticle } from "./articleStore.js"

// 사용자의 단어장을 최신순으로 조회한다. articles와 join해 term 저장 당시의
// 기사 제목/URL을 복원한다(client/src/pages/Vocabulary.jsx가 기대하는
// articleTitle/articleUrl 필드 형태를 그대로 유지).
export async function readVocabulary(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("vocabulary")
    .select("term, definition, added_at, articles(title, url)")
    .eq("user_id", userId)
    .order("added_at", { ascending: false })

  if (error) throw new Error(error.message)

  return data.map((row) => ({
    term: row.term,
    definition: row.definition,
    articleTitle: row.articles.title,
    articleUrl: row.articles.url,
    addedAt: row.added_at,
  }))
}

// 같은 기사가 재분석되며 이미 저장된 용어가 다시 들어올 수 있어 중복
// 추가하지 않는다(사용자별로 term을 대소문자 무시 비교).
export async function appendVocabulary(userId, term, definition, articleTitle, articleUrl) {
  const supabase = getSupabase()
  const article = await ensureArticle(articleTitle, articleUrl)

  const { data: existing, error: selectError } = await supabase
    .from("vocabulary")
    .select("id")
    .eq("user_id", userId)
    .ilike("term", term)
    .maybeSingle()

  if (selectError) throw new Error(selectError.message)
  if (existing) return null

  const { data: saved, error: insertError } = await supabase
    .from("vocabulary")
    .insert({ user_id: userId, article_id: article.id, term, definition })
    .select("term, definition, added_at")
    .single()

  if (insertError) throw new Error(insertError.message)

  return {
    term: saved.term,
    definition: saved.definition,
    articleTitle,
    articleUrl,
    addedAt: saved.added_at,
  }
}
