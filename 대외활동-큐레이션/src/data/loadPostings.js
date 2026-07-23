import { supabase } from "../lib/supabase";

// 공고를 Supabase postings 테이블에서 전부 읽는다.
// Supabase select는 한 번에 최대 1000행만 준다. 총망라가 목표라 1000에서 잘리면 안 되므로,
// range로 페이지를 넘겨가며 끝까지 받아 합친다(수천 건은 브라우저 메모리로 감당, docs/schema.md 결정).
export async function loadPostings() {
  if (!supabase) throw new Error("Supabase 연결이 설정되지 않았어요. .env를 확인하세요.");
  const rows = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    const { data, error } = await supabase.from("postings").select("*").range(from, from + step - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < step) break;
  }
  return rows.map(fromRow);
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
    collectedAt: row.created_at, // DB에 저장된 시각(수집 시각). 화면 신선도 표시용.
    parseStatus: row.parse_status,
    eligibility: row.eligibility,
    eligibilityText: row.eligibility?.text ?? row.eligibility_text ?? "",
  };
}
