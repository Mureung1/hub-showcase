import { getSupabase } from "./supabaseClient.js"

// articles는 url을 유니크 키로 삼는 전역 마스터 테이블이다. title을
// upsert해서, 이전에 파싱 실패로 잘못된 제목(예: fallback 기사 제목)이
// 저장된 적 있어도 재분석/재판단 시 최신 title로 자동 정정되게 한다
// (select-then-insert였다면 기존 row를 그대로 반환해 stale title이
// 영구히 남는다). vocabulary/decisions 등 사용자별 테이블이 공통으로 참조한다.
export async function ensureArticle(title, url) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("articles")
    .upsert({ title, url }, { onConflict: "url" })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return data
}
