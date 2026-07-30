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
    .select("id, fast_analysis, slow_analysis")
    .single()

  if (error) throw new Error(error.message)
  return data
}

// analyze(fast lane) 결과 캐시. 같은 url로 재분석 요청이 와도 Claude를 다시
// 부르지 않고 이 값을 재사용한다(비용/지연 절감).
export async function saveFastAnalysis(articleId, analysis) {
  const supabase = getSupabase()
  const { error } = await supabase.from("articles").update({ fast_analysis: analysis }).eq("id", articleId)
  if (error) throw new Error(error.message)
}

// analyze/details(slow lane) 결과 캐시. terms 문자열이 기사당 고정값이
// 되므로, appendVocabulary의 문자열 완전일치 dedup이 재방문 시에도 정확히
// 걸러낼 수 있게 된다(LLM 비결정성으로 인한 단어장 중복 적재 방지).
export async function saveSlowAnalysis(articleId, analysis) {
  const supabase = getSupabase()
  const { error } = await supabase.from("articles").update({ slow_analysis: analysis }).eq("id", articleId)
  if (error) throw new Error(error.message)
}
