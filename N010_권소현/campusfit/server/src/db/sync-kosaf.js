// 한국장학재단 학자금지원정보 API를 가져와 listings 테이블에 upsert하는 동기화 스크립트.
// 학년구분은 학년(1~4)이 아니라 학기(1~8+) 단위라 eligibleGrades로 안전하게 매핑할 수 없어
// null(전체 대상)로 둔다. 지역거주여부는 아래 REGION_KEYWORDS로 광역 단위 키워드만 매칭한다
// (시/군/구 단위로만 지역이 언급된 경우는 놓칠 수 있음 — 그런 경우는 매칭 실패로 보고 null 처리).
import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { fetchKosafScholarships } from "../services/kosaf.js";

// client/src/data/mockListings.js의 regionOptions와 동일한 코드값 ("all" 제외).
// 충북/충남/전북/전남/경북/경남은 "충청북도"처럼 준말이 원래 지명의 부분 문자열이 아니라서
// (충청북도.includes("충북") === false) 공식 전체 명칭도 같이 매칭 대상에 넣는다.
const REGION_KEYWORDS = [
  { value: "seoul", keywords: ["서울"] },
  { value: "busan", keywords: ["부산"] },
  { value: "daegu", keywords: ["대구"] },
  { value: "incheon", keywords: ["인천"] },
  { value: "gwangju", keywords: ["광주"] },
  { value: "daejeon", keywords: ["대전"] },
  { value: "ulsan", keywords: ["울산"] },
  { value: "sejong", keywords: ["세종"] },
  { value: "gyeonggi", keywords: ["경기"] },
  { value: "gangwon", keywords: ["강원"] },
  { value: "chungbuk", keywords: ["충북", "충청북도"] },
  { value: "chungnam", keywords: ["충남", "충청남도"] },
  { value: "jeonbuk", keywords: ["전북", "전라북도"] },
  { value: "jeonnam", keywords: ["전남", "전라남도"] },
  { value: "gyeongbuk", keywords: ["경북", "경상북도"] },
  { value: "gyeongnam", keywords: ["경남", "경상남도"] },
  { value: "jeju", keywords: ["제주"] },
];

function parseEligibleRegions(text) {
  if (!text) return null;
  const matched = REGION_KEYWORDS.filter((region) =>
    region.keywords.some((keyword) => text.includes(keyword))
  ).map((region) => region.value);
  return matched.length > 0 ? matched : null;
}

function toListingRow(item) {
  // 지역거주여부 텍스트가 "도내"/"관내"처럼 대명사만 쓰는 경우가 많아서, 지자체 소속
  // 재단·시청·도청은 보통 기관명 자체에 지역명이 들어있는 운영기관명도 같이 확인한다.
  const regions = parseEligibleRegions(
    `${item["지역거주여부 상세내용"] || ""} ${item["운영기관명"] || ""}`
  );
  return {
    id: `kosaf-${item["번호"]}`,
    category_id: "scholarship",
    title: item["상품명"],
    description: `${item["운영기관명"] || ""} · ${item["상품구분"] || ""}`.trim(),
    deadline_date: item["모집종료일"],
    eligible_regions: regions ? JSON.stringify(regions) : null,
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
