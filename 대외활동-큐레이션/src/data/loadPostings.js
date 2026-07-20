import { supabase } from "../lib/supabase";

// 공고를 Supabase postings 테이블에서 읽는다.
export async function loadPostings() {
  if (!supabase) throw new Error("Supabase 연결이 설정되지 않았어요. .env를 확인하세요.");
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
