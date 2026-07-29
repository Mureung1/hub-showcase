// 한국장학재단 학자금지원정보 API를 가져와 listings 테이블에 upsert하는 동기화 스크립트.
// 학년구분은 학년(1~4)이 아니라 학기(1~8+) 단위라 eligibleGrades로 안전하게 매핑할 수 없어
// null(전체 대상)로 둔다. 지역거주여부는 먼저 REGION_KEYWORDS로 광역 단위 키워드를 찾고,
// 못 찾으면 SIGUNGU_TO_REGION으로 시/군 단위 지명까지 한 번 더 시도한다 (2026-07-29 추가 —
// "인제군", "거제시"처럼 시/군만 언급되고 광역시도명이 없는 경우를 위함). "고성군"처럼 이름이
// 겹치는 시/군(강원 고성군 vs 경남 고성군)은 매핑에서 빼고, 대신 홈페이지 주소 도메인으로
// 구분한다(resolveAmbiguousSigungu, 2026-07-29 — 강원고성군청은 gwgs.go.kr, 경남 고성군청은
// goseong.go.kr을 쓰는 걸 확인함). 8개 특·광역시 소속 구(중구/남구 등)도 이름이 여러 도시에서
// 겹쳐서 매핑에 넣지 않았다.
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

// 9개 도의 시/군 단위 지명 → 광역시도 코드. 이름이 둘 이상의 광역시도에서 겹치는
// 시/군(예: 고성군 - 강원/경남)은 오매칭을 피하기 위해 일부러 넣지 않았다.
const SIGUNGU_TO_REGION = {
  gyeonggi: [
    "수원시", "성남시", "의정부시", "안양시", "부천시", "광명시", "평택시", "동두천시",
    "안산시", "고양시", "과천시", "구리시", "남양주시", "오산시", "시흥시", "군포시",
    "의왕시", "하남시", "용인시", "파주시", "이천시", "안성시", "김포시", "화성시",
    "광주시", "양주시", "포천시", "여주시", "연천군", "가평군", "양평군",
  ],
  gangwon: [
    "춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시", "홍천군",
    "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군", "양구군", "인제군", "양양군",
  ],
  chungbuk: [
    "청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군",
    "괴산군", "음성군", "단양군",
  ],
  chungnam: [
    "천안시", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시",
    "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군",
  ],
  jeonbuk: [
    "전주시", "군산시", "익산시", "정읍시", "남원시", "김제시", "완주군", "진안군",
    "무주군", "장수군", "임실군", "순창군", "고창군", "부안군",
  ],
  jeonnam: [
    "목포시", "여수시", "순천시", "나주시", "광양시", "담양군", "곡성군", "구례군",
    "고흥군", "보성군", "화순군", "장흥군", "강진군", "해남군", "영암군", "무안군",
    "함평군", "영광군", "장성군", "완도군", "진도군", "신안군",
  ],
  gyeongbuk: [
    "포항시", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시",
    "문경시", "경산시", "군위군", "의성군", "청송군", "영양군", "영덕군", "청도군",
    "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군",
  ],
  gyeongnam: [
    "창원시", "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시",
    "의령군", "함안군", "창녕군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군",
  ],
};

// 이름이 겹치는 시/군을 지자체 홈페이지 도메인으로 구분한다. 새 케이스가 발견되면 여기에 추가.
const AMBIGUOUS_SIGUNGU = [
  {
    name: "고성군",
    domains: [
      { includes: "gwgs.go.kr", value: "gangwon" },
      { includes: "goseong.go.kr", value: "gyeongnam" },
    ],
  },
];

function resolveAmbiguousSigungu(text, url) {
  if (!url) return null;
  for (const { name, domains } of AMBIGUOUS_SIGUNGU) {
    if (!text.includes(name)) continue;
    const match = domains.find((d) => url.includes(d.includes));
    if (match) return [match.value];
  }
  return null;
}

function parseEligibleRegions(text, url) {
  if (!text) return null;
  const matched = REGION_KEYWORDS.filter((region) =>
    region.keywords.some((keyword) => text.includes(keyword))
  ).map((region) => region.value);
  if (matched.length > 0) return matched;

  for (const [region, sigunguNames] of Object.entries(SIGUNGU_TO_REGION)) {
    if (sigunguNames.some((name) => text.includes(name))) return [region];
  }

  return resolveAmbiguousSigungu(text, url);
}

function toListingRow(item) {
  // 지역거주여부 텍스트가 "도내"/"관내"처럼 대명사만 쓰는 경우가 많아서, 지자체 소속
  // 재단·시청·도청은 보통 기관명 자체에 지역명이 들어있는 운영기관명도 같이 확인한다.
  const regions = parseEligibleRegions(
    `${item["지역거주여부 상세내용"] || ""} ${item["운영기관명"] || ""}`,
    item["홈페이지 주소"]
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
