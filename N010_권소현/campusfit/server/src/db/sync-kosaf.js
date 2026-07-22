// 한국장학재단 학자금지원정보 API를 가져와 listings 테이블에 upsert하는 동기화 스크립트.
// API의 지역거주여부/학년구분은 자유 서술형 텍스트라 eligibleRegions/eligibleGrades
// 코드값(seoul, 2 등)으로 안전하게 매핑할 수 없어 null(전체 대상)로 둔다.
import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { fetchKosafScholarships } from "../services/kosaf.js";

function toListingRow(item) {
  return {
    id: `kosaf-${item["번호"]}`,
    category_id: "scholarship",
    title: item["상품명"],
    description: `${item["운영기관명"] || ""} · ${item["상품구분"] || ""}`.trim(),
    deadline_date: item["모집종료일"],
    eligible_regions: null,
    eligible_grades: null,
    interest: null,
    team_board_count: 0,
    source_url: item["홈페이지 주소"] || null,
  };
}

const today = new Date().toISOString().slice(0, 10);
const MAX_PAGES = 19; // 전체 약 1850건을 다 훑어서 마감 안 지난 것만 모음 (perPage 100 기준)

const rows = [];
let totalCount = 0;
for (let page = 1; page <= MAX_PAGES; page++) {
  const result = await fetchKosafScholarships({ page, perPage: 100 });
  totalCount = result.totalCount;
  const valid = result.data.filter(
    (item) => item["모집종료일"] && item["상품명"] && item["모집종료일"] >= today
  );
  rows.push(...valid.map(toListingRow));
  if (result.data.length < 100) break; // 마지막 페이지
}

const { error } = await supabase.from("listings").upsert(rows, { onConflict: "id" });
if (error) throw error;

console.log(`한국장학재단 동기화 완료 — ${rows.length}건 저장 (전체 ${totalCount}건 중 ${MAX_PAGES}페이지 조회)`);
