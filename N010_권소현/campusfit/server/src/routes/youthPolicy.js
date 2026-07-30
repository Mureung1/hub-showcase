import { Router } from "express";

const router = Router();
// item.zipCd(콤마로 나열된 5자리 행정구역코드)의 앞 2자리는 시/도를 가리킨다.
// 전국 2,694건 데이터로 실제 매핑을 확인해서 만든 표 — 광주/전남은 "전남광주통합특별시"로
// 행정구역이 합쳐져서 코드(12)를 공유한다. 강원(51)·전북(52)은 특별자치도 전환 이후의
// 신규 코드다. 예전엔 제목·설명 텍스트에서 지명을 글자 매칭으로 찾았는데, "계양구" 안에
// "양구"가 우연히 들어있거나 "민영주택" 안에 "영주"가 우연히 들어있는 식으로 오탐이 잦아서
// 이 구조화된 코드 기반으로 바꿨다.
const ZIP_PREFIX_TO_REGIONS = {
  11: ["seoul"],
  26: ["busan"],
  27: ["daegu"],
  28: ["incheon"],
  12: ["gwangju", "jeonnam"],
  30: ["daejeon"],
  31: ["ulsan"],
  36: ["sejong"],
  41: ["gyeonggi"],
  51: ["gangwon"],
  43: ["chungbuk"],
  44: ["chungnam"],
  52: ["jeonbuk"],
  47: ["gyeongbuk"],
  48: ["gyeongnam"],
  50: ["jeju"],
};
const EXCLUDE_KEYWORDS = ["신혼부부"];
// 전국 대상 정책은 zipCd에 "특정 지역 없음"으로 표시되는 게 아니라, 전국 모든 시/군/구
// 코드를 다 나열하는 방식이라 guessRegions가 그대로 받으면 17개 광역 지역이 전부 담긴
// 배열이 나온다 — 그러면 어떤 지역으로 필터링해도 "지역 추천"이 붙어버린다 (2026-07-29
// 확인, K-패스·청년주택드림청약통장 실제 데이터로 검증). 매칭된 지역이 전체 지역 수와
// 같으면 전국 대상으로 보고 지역 제한 없음(undefined)으로 처리한다.
const ALL_REGIONS = new Set(Object.values(ZIP_PREFIX_TO_REGIONS).flat());

function isExcluded(text) {
  return EXCLUDE_KEYWORDS.some((k) => text.includes(k));
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const deadline = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((deadline - today) / 86400000);
}

// aplyYmd는 "20260728 ~ 20260930" 형식. 상시/미정 정책은 빈 문자열이라 파싱 안 되면
// undefined를 반환 — 이 경우 실제 마감이 없는 것으로 보고 큰 값(999)을 그대로 쓴다.
function parseDeadline(aplyYmd) {
  const match = aplyYmd && aplyYmd.match(/(\d{8})\s*~\s*(\d{8})/);
  if (!match) return undefined;
  const end = match[2];
  return `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`;
}

function guessRegions(zipCd) {
  if (!zipCd) return undefined;
  const regions = new Set();
  for (const code of zipCd.split(",")) {
    const prefix = code.trim().slice(0, 2);
    for (const region of ZIP_PREFIX_TO_REGIONS[prefix] || []) regions.add(region);
  }
  if (regions.size === 0 || regions.size === ALL_REGIONS.size) return undefined;
  return [...regions];
}
function guessCategory(item) {
  const text = `${item.plcyNm} ${item.plcyExplnCn}`;
  if (item.__forceInternship || text.includes("인턴")) return "internship";
  if (item.__forceActivity) return "activity";
  return "local";
}
const LOCAL_INTEREST_KEYWORDS = {
  주거: ["주거", "월세", "전세", "임대"],
  교통: ["교통", "버스", "정기권", "통학"],
  취업: ["취업", "구직", "채용", "일자리"],
  문화: ["문화", "공연", "축제", "독서"],
  금융: ["금융", "대출", "적금", "캐시백", "자산형성"],
  복지: ["복지", "건강", "심리", "마음", "치과"],
  창업: ["창업"],
  교육: ["교육", "연수", "탐방", "유학", "국외"],
};

const INTERNSHIP_INTEREST_KEYWORDS = {
  개발: ["개발", "프로그래밍", "소프트웨어", "IT", "웹", "앱"],
  "데이터/AI": ["데이터", "AI", "인공지능", "빅데이터"],
  "엔지니어링/제조": ["제조", "설계", "엔지니어", "기계", "전자"],
  "경영/기획": ["경영", "기획", "전략", "신사업"],
  마케팅: ["마케팅", "홍보", "브랜드", "콘텐츠"],
  "공공/행정": ["행정", "공공", "지자체", "공기업", "정책"],
};

const ACTIVITY_INTEREST_KEYWORDS = {
  봉사: ["봉사", "나눔", "돌봄"],
  "홍보/서포터즈": ["서포터즈", "홍보", "기자단", "리포터", "브랜드참여단"],
  국제교류: ["국제", "해외", "글로벌", "교류"],
  정책: ["위원회", "협의체", "네트워크", "조정위"],
  정책참여: ["정책", "참여단", "특사단"],
  "탐방/체험": ["탐방", "체험", "포럼"],
  "이공계/기술": ["이공계", "과학", "공학", "기술"],
};
// "정책참여" 태그가 붙는 mclsfNm(청년참여·정책인프라구축) 안에는 "청년정책조정위원회
// 운영"처럼 진짜 위원회·협의체 성격인 것도 많이 섞여 있다(84건 중 19건). 제목에 이
// 키워드가 있으면 "정책참여" 대신 "정책"으로 더 구체적으로 분류한다.
const COMMITTEE_TITLE_KEYWORDS = ["위원회", "협의체", "네트워크", "조정위"];
const POLICY_PARTICIPATION_MCLSF = new Set(["청년참여", "정책인프라구축"]);

// item.mclsfNm(정부가 직접 매긴 중분류, 예: "청년참여"·"취업"·"주택 및 거주지")을 관심분야로
// 우선 매핑한다. 제목·설명 텍스트 키워드 매칭보다 훨씬 정확하다 — 예를 들어 "충남형 청년
// 한달살이"는 설명에 "정책"이란 말이 아예 없는데도 키워드 매칭만으로는 "정책참여"로 잘못
// 잡혔었다. internship은 mclsfNm이 "취업/창업" 같은 지원 단계만 구분하고 개발·마케팅
// 같은 직무 분야 정보가 없어서 이 매핑을 안 쓰고 기존 키워드 매칭만 쓴다.
const MCLSF_TO_LOCAL_INTEREST = {
  취업: "취업",
  재직자: "취업",
  창업: "창업",
  "주택 및 거주지": "주거",
  "전월세 및 주거급여 지원": "주거",
  기숙사: "주거",
  "문화활동 및 생활지원": "문화",
  문화활동: "문화",
  예술인지원: "문화",
  건강: "복지",
  권익보호: "복지",
  "취약계층 및 금융지원": "금융",
  미래역량강화: "교육",
  교육비지원: "교육",
  "온·오프라인교육": "교육",
  온라인교육: "교육",
  청년참여: "정책",
  정책인프라구축: "정책",
};
const MCLSF_TO_ACTIVITY_INTEREST = {
  청년참여: "정책참여",
  정책인프라구축: "정책참여",
  청년국제교류: "국제교류",
  권익보호: "정책참여",
};

function guessInterestFromMclsf(categoryId, mclsfNm, title) {
  if (!mclsfNm) return undefined;
  const map = categoryId === "activity" ? MCLSF_TO_ACTIVITY_INTEREST : categoryId === "local" ? MCLSF_TO_LOCAL_INTEREST : null;
  if (!map) return undefined;
  for (const part of mclsfNm.split(",")) {
    const trimmed = part.trim();
    const interest = map[trimmed];
    if (!interest) continue;
    if (POLICY_PARTICIPATION_MCLSF.has(trimmed) && COMMITTEE_TITLE_KEYWORDS.some((k) => title.includes(k))) return "정책";
    return interest;
  }
  return undefined;
}

function guessInterest(categoryId, mclsfNm, title, text) {
  const fromMclsf = guessInterestFromMclsf(categoryId, mclsfNm, title);
  if (fromMclsf) return fromMclsf;

  const table =
    categoryId === "internship"
      ? INTERNSHIP_INTEREST_KEYWORDS
      : categoryId === "activity"
      ? ACTIVITY_INTEREST_KEYWORDS
      : LOCAL_INTEREST_KEYWORDS;
  for (const [interest, keywords] of Object.entries(table)) {
    if (keywords.some((k) => text.includes(k))) return interest;
  }
  return undefined;
}

function toYouthListing(item) {
  const categoryId = guessCategory(item);
  const text = `${item.plcyNm} ${item.plcyExplnCn} ${item.lclsfNm} ${item.sprvsnInstCdNm || ""} ${item.rgtrInstCdNm || ""} ${item.operInstCdNm || ""}`;
  const deadlineDate = parseDeadline(item.aplyYmd);
  return {
    id: `youth-${item.plcyNo}`,
    categoryId,
    title: item.plcyNm,
    desc: item.plcyExplnCn,
    interest: guessInterest(categoryId, item.mclsfNm, item.plcyNm, text),
    sourceUrl: item.aplyUrlAddr || item.refUrlAddr1 || item.refUrlAddr2 || undefined,
    eligibleRegions: guessRegions(item.zipCd),
    dDay: deadlineDate ? daysUntil(deadlineDate) : 999, // 상시/미정은 마감 없는 것으로 취급
  };
}
// 온통청년 서버가 가끔(특히 pageSize=3000 같은 무거운 요청 여러 개를 동시에 보내면)
// JSON 대신 HTML 에러 페이지를 돌려줄 때가 있다. 그럴 때 하나가 죽어서 전체 라우트가
// 500나는 걸 막기 위해, 실패하면 빈 배열로 취급하고 서버 로그에만 남긴다.
async function fetchYouthPolicyList(url, label) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data?.result?.youthPolicyList || [];
  } catch (err) {
    console.error(`온통청년 API 실패 (${label}):`, err.message);
    return [];
  }
}

router.get("/", async (req, res) => {
  const apiKey = process.env.YOUTH_POLICY_API_KEY;
  const generalUrl = `https://www.youthcenter.go.kr/go/ythip/getPlcy?apiKeyNm=${apiKey}&pageSize=3000&rtnType=json`;
  const internshipUrl = `https://www.youthcenter.go.kr/go/ythip/getPlcy?apiKeyNm=${apiKey}&pageSize=3000&rtnType=json&plcyKywdNm=인턴`;
  const activityUrl = `https://www.youthcenter.go.kr/go/ythip/getPlcy?apiKeyNm=${apiKey}&pageSize=3000&rtnType=json&lclsfNm=참여권리`;

  const [generalList, internshipList, activityList] = await Promise.all([
    fetchYouthPolicyList(generalUrl, "전체"),
    fetchYouthPolicyList(internshipUrl, "인턴"),
    fetchYouthPolicyList(activityUrl, "참여권리"),
  ]);

  const internshipItems = internshipList.map((item) => ({
    ...item,
    __forceInternship: true,
  }));
  const activityItems = activityList.map((item) => ({
    ...item,
    __forceActivity: true,
  }));
  const allItems = [...generalList, ...internshipItems, ...activityItems];
  // plcyNm(제목)으로 중복 제거하면, 서로 다른 정책(plcyNo)이 우연히 제목이 같을 때
  // 하나가 사라지는 문제가 있었다 (2026-07-29 발견 — "서산시 청년의 날 행사 추진"이라는
  // 이름의 서산시 전용 정책과 전국 대상 정책이 따로 있었는데, 제목 기준 중복 제거 때문에
  // 전국 버전만 남아서 지역 필터링이 무의미해졌었음). 정책 고유번호(plcyNo)로 중복을 걸러야
  // 진짜 같은 정책만 합쳐진다.
  const uniqueItems = [...new Map(allItems.map((item) => [item.plcyNo, item])).values()];

  const listings = uniqueItems
    .filter((item) => !isExcluded(`${item.plcyNm} ${item.plcyExplnCn}`))
    .map(toYouthListing)
    .filter((listing) => listing.dDay >= 0); // 마감일이 지난 건 목록에서 뺀다
  res.json(listings);
});
export default router;