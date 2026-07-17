import { getSupabase } from "./supabaseClient.js"

// articles는 url을 유니크 키로 삼는 전역 마스터 테이블이다 — 이미 있으면
// 그 row를, 없으면 새로 만든 row를 반환한다.
async function ensureArticle(title, url) {
  const supabase = getSupabase()
  const { data: existing, error: selectError } = await supabase
    .from("articles")
    .select("id")
    .eq("url", url)
    .maybeSingle()

  if (selectError) throw new Error(selectError.message)
  if (existing) return existing

  const { data: inserted, error: insertError } = await supabase
    .from("articles")
    .insert({ title, url })
    .select("id")
    .single()

  if (insertError) throw new Error(insertError.message)
  return inserted
}

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
