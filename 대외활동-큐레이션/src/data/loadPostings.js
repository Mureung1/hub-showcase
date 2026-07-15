import { supabase } from "../lib/supabase";
import { ACTIVITIES } from "./activities";

// 공고를 불러온다. Supabase 설정이 있으면 postings 테이블에서 읽고, 없으면 mock으로 fallback.
// .env만 채우면 실데이터로 자동 전환된다(화면 코드는 안 바뀜).
export async function loadPostings() {
  if (!supabase) {
    // 아직 Supabase 세팅 전. mock으로. 살짝 지연을 줘 로딩 상태도 눈으로 보이게.
    await new Promise((r) => setTimeout(r, 150));
    return ACTIVITIES;
  }
  const { data, error } = await supabase.from("postings").select("*");
  if (error) throw error;
  return data.map(fromRow);
}

// Supabase row(스네이크 케이스) -> 화면이 쓰는 모양(mock과 동일). match.js를 그대로 쓰려고 맞춘다.
function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    org: row.org,
    category: row.category,
    track: row.track,
    source: row.source,
    url: row.url,
    deadline: row.deadline,
    postedAt: row.posted_at,
    parseStatus: row.parse_status,
    eligibility: row.eligibility,
    eligibilityText: row.eligibility?.text ?? row.eligibility_text ?? "",
  };
}
