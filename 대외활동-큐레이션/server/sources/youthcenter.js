// 온통청년 청년정책 수집기. 크롤링이 아니라 API 호출이라 구조화 JSON을 받는다. (docs/데이터-수집.md)
// 나이·지역이 이미 구조 필드로 와서 규칙 매핑만으로 충분하다(LLM 불필요). 전공·학년은 청년정책 특성상
// 대부분 무관(대학생 전용 프로그램이 아니라 청년 전반 대상)이라 빈 배열로 둔다.
import { fileURLToPath } from "url";

const BASE = "https://www.youthcenter.go.kr";
const DETAIL_BASE = `${BASE}/youthPolicy/ythPlcyTotalSearch/ythPlcyDetail`;
const KEY = process.env.YOUTH_POLICY_API_KEY;

// 행정표준코드(시군구코드) 앞 2자리 -> 지역명. zipCd 필드가 실제로는 우편번호가 아니라 이 코드다(실측 확인).
const REGION_PREFIX = {
  11: "서울", 26: "부산", 27: "대구", 28: "인천", 29: "광주", 30: "대전", 31: "울산", 36: "세종",
  41: "경기", 42: "강원", 43: "충북", 44: "충남", 45: "전북", 46: "전남", 47: "경북", 48: "경남", 50: "제주",
};
// 부산 기초구군 코드(zipCd 앞 5자리). 금정구만 따로 골라 쓸 때 참고.
export const BUSAN_GEUMJEONG_CODE = "26410";

// zipCd(콤마 목록) -> canonical 지역명 배열. 서로 다른 시도가 8개 이상 걸리면 사실상 전국 대상 -> 무관([]).
function deriveRegions(zipCd) {
  const codes = (zipCd || "").split(",").map((s) => s.trim()).filter(Boolean);
  const names = new Set();
  for (const c of codes) {
    const region = REGION_PREFIX[c.slice(0, 2)];
    if (region) names.add(region);
  }
  if (names.size >= 8) return [];
  return [...names];
}

// ptcpPrpTrgtCn(참여제외대상)에 "재학생"이 있으면(이 필드 자체가 제외 목록이라 언급=제외란 뜻) 재학생은
// 못 들어간다. "졸업예정" 예외 문구가 흔히 같이 오길래(실측: K-뉴딜아카데미·청년미래플러스) 그 경우만
// 졸업예정으로 좁힌다. 재학생 언급 자체가 없으면 무관([]).
export function deriveEnrollment(ptcpPrpTrgtCn) {
  const text = ptcpPrpTrgtCn || "";
  if (!text.includes("재학생")) return [];
  return ["졸업예정"];
}

// "20260101 ~ 20261231" -> 끝 날짜를 YYYY-MM-DD로. 비어있으면(상시) null.
function parseDeadline(aplyYmd) {
  const m = (aplyYmd || "").match(/(\d{8})\s*$/);
  if (!m) return null;
  const s = m[1];
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

async function callApi(pageNum, pageSize) {
  const url = `${BASE}/go/ythip/getPlcy?apiKeyNm=${KEY}&pageNum=${pageNum}&pageSize=${pageSize}&rtnType=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`온통청년 ${res.status}`);
  const json = await res.json();
  if (json.resultCode !== 200) throw new Error(`온통청년 API 오류: ${json.resultMessage}`);
  return json.result;
}

// 한 페이지. 반환: { totalCount, items:[{ plcyNo, title, org, deadline, ageMin, ageMax, regions, text, sourceUrl }] }
export async function fetchList(pageNum = 1, pageSize = 100) {
  const result = await callApi(pageNum, pageSize);
  const items = (result.youthPolicyList || []).map((p) => {
    const minAge = Number(p.sprtTrgtMinAge) || 0;
    const maxAge = Number(p.sprtTrgtMaxAge) || 0;
    return {
      plcyNo: p.plcyNo,
      title: (p.plcyNm || "").trim(),
      org: p.sprvsnInstCdNm || "",
      deadline: parseDeadline(p.aplyYmd),
      ageMin: minAge > 0 ? minAge : null,
      ageMax: maxAge > 0 ? maxAge : null,
      regions: deriveRegions(p.zipCd),
      text: (p.plcySprtCn || p.plcyExplnCn || "").replace(/\s+/g, " ").trim(),
      mclsfNm: p.mclsfNm || "", // 중분류(실측: "교육비지원" 등). 장학 성격 판별에 씀 - collect.js
      enrollment: deriveEnrollment(p.ptcpPrpTrgtCn),
      sourceUrl: `${DETAIL_BASE}/${p.plcyNo}`,
    };
  });
  return { totalCount: result.pagging?.totCount ?? 0, items };
}

export function toRaw(item) {
  return {
    source_url: item.sourceUrl,
    raw_title: item.title,
    org: item.org,
    deadline: item.deadline,
    raw_text: item.text,
    scraped_at: new Date().toISOString(),
  };
}

// 직접 실행: 목록 몇 건 + 부산/금정구 필터 결과를 찍어 실제로 되는지 확인.
//   node sources/youthcenter.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { totalCount, items } = await fetchList(1, 20);
  console.log(`온통청년 청년정책 총 ${totalCount}건 (이번 페이지 ${items.length}건)\n`);
  for (const it of items.slice(0, 8)) {
    console.log(`- ${it.title.slice(0, 35)} | 지역:${it.regions.join(",") || "전국"} | 나이:${it.ageMin ?? "?"}~${it.ageMax ?? "?"} | 마감:${it.deadline ?? "상시"}`);
  }
  const busan = items.filter((it) => it.regions.includes("부산"));
  console.log(`\n부산 포함 정책: ${busan.length}건`);
}
