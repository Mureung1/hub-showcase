import { getSupabase } from "./supabaseClient.js"

// articles는 url을 유니크 키로 삼는 전역 마스터 테이블이다 — 이미 있으면
// 그 row를, 없으면 새로 만든 row를 반환한다. vocabulary/decisions 등
// 사용자별 테이블이 공통으로 참조한다.
export async function ensureArticle(title, url) {
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
