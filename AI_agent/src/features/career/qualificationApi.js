const QUALIFICATION_API_URL =
  "http://openapi.q-net.or.kr/api/service/rest/InquiryListNationalQualifcationSVC/getList";

const createFallbackQualification = ({
  id,
  name,
  type = "국가기술자격",
  series = "",
  field = "",
  subField = "",
  aliases = [],
}) => ({
  id: `fallback-${id}`,
  name,
  type,
  series,
  field,
  subField,
  aliases,
});

const fallbackQualifications = [
  createFallbackQualification({
    id: "info-engineer",
    name: "정보처리기사",
    series: "기사",
    field: "정보통신",
    subField: "정보기술",
  }),
  createFallbackQualification({
    id: "info-industrial-engineer",
    name: "정보처리산업기사",
    series: "산업기사",
    field: "정보통신",
    subField: "정보기술",
  }),
  createFallbackQualification({
    id: "info-technician",
    name: "정보처리기능사",
    series: "기능사",
    field: "정보통신",
    subField: "정보기술",
  }),
  createFallbackQualification({
    id: "computer",
    name: "컴퓨터활용능력",
    series: "서비스",
    field: "경영·회계·사무",
    subField: "사무",
    aliases: ["컴활", "컴퓨터활용능력 1급", "컴퓨터활용능력 2급"],
  }),
  createFallbackQualification({
    id: "word-processor",
    name: "워드프로세서",
    series: "서비스",
    field: "경영·회계·사무",
    subField: "사무",
    aliases: ["워드"],
  }),
  createFallbackQualification({
    id: "electric-engineer",
    name: "전기기사",
    series: "기사",
    field: "전기·전자",
    subField: "전기",
  }),
  createFallbackQualification({
    id: "electric-industrial",
    name: "전기산업기사",
    series: "산업기사",
    field: "전기·전자",
    subField: "전기",
  }),
  createFallbackQualification({
    id: "electric-work",
    name: "전기공사기사",
    series: "기사",
    field: "전기·전자",
    subField: "전기",
  }),
  createFallbackQualification({
    id: "safety",
    name: "산업안전기사",
    series: "기사",
    field: "안전관리",
    subField: "안전관리",
  }),
  createFallbackQualification({
    id: "dangerous-material",
    name: "위험물산업기사",
    series: "산업기사",
    field: "화학",
    subField: "위험물",
  }),
  createFallbackQualification({
    id: "architecture",
    name: "건축기사",
    series: "기사",
    field: "건설",
    subField: "건축",
  }),
  createFallbackQualification({
    id: "civil",
    name: "토목기사",
    series: "기사",
    field: "건설",
    subField: "토목",
  }),
  createFallbackQualification({
    id: "accounting",
    name: "전산회계",
    type: "민간/기타",
    series: "회계",
    field: "경영·회계·사무",
    subField: "회계",
    aliases: ["전산회계 1급", "전산회계 2급"],
  }),
  createFallbackQualification({
    id: "tax-accounting",
    name: "전산세무",
    type: "민간/기타",
    series: "회계",
    field: "경영·회계·사무",
    subField: "회계",
    aliases: ["전산세무 1급", "전산세무 2급"],
  }),
  createFallbackQualification({
    id: "erp-accounting",
    name: "ERP정보관리사",
    type: "민간/기타",
    series: "회계",
    field: "경영·회계·사무",
    subField: "회계",
    aliases: ["ERP 정보관리사"],
  }),
  createFallbackQualification({
    id: "cook",
    name: "한식조리기능사",
    series: "기능사",
    field: "음식서비스",
    subField: "조리",
  }),
  createFallbackQualification({
    id: "western-cook",
    name: "양식조리기능사",
    series: "기능사",
    field: "음식서비스",
    subField: "조리",
  }),
  createFallbackQualification({
    id: "bakery",
    name: "제과기능사",
    series: "기능사",
    field: "음식서비스",
    subField: "제과·제빵",
  }),
  createFallbackQualification({
    id: "bread",
    name: "제빵기능사",
    series: "기능사",
    field: "음식서비스",
    subField: "제과·제빵",
  }),
  createFallbackQualification({
    id: "beauty",
    name: "미용사",
    series: "기능사",
    field: "이용·숙박·여행·오락·스포츠",
    subField: "미용",
  }),
  createFallbackQualification({
    id: "social-worker",
    name: "사회복지사",
    type: "국가전문자격",
    series: "전문자격",
    field: "사회복지",
    subField: "사회복지",
    aliases: ["사회복지사 1급", "사회복지사 2급"],
  }),
  createFallbackQualification({
    id: "nurse-assistant",
    name: "간호조무사",
    type: "국가전문자격",
    series: "전문자격",
    field: "보건·의료",
    subField: "보건",
  }),
  createFallbackQualification({
    id: "driver",
    name: "자동차정비기능사",
    series: "기능사",
    field: "기계",
    subField: "자동차",
  }),
  createFallbackQualification({
    id: "sqld",
    name: "SQLD",
    type: "민간/기타",
    series: "데이터",
    field: "정보통신",
    subField: "데이터",
    aliases: ["SQL 개발자"],
  }),
  createFallbackQualification({
    id: "sqlp",
    name: "SQLP",
    type: "민간/기타",
    series: "데이터",
    field: "정보통신",
    subField: "데이터",
    aliases: ["SQL 전문가"],
  }),
  createFallbackQualification({
    id: "adsp",
    name: "ADsP",
    type: "민간/기타",
    series: "데이터",
    field: "정보통신",
    subField: "데이터",
    aliases: ["데이터분석 준전문가"],
  }),
  createFallbackQualification({
    id: "adp",
    name: "ADP",
    type: "민간/기타",
    series: "데이터",
    field: "정보통신",
    subField: "데이터",
    aliases: ["데이터분석 전문가"],
  }),
  createFallbackQualification({
    id: "big-data-engineer",
    name: "빅데이터분석기사",
    series: "기사",
    field: "정보통신",
    subField: "데이터",
  }),
  createFallbackQualification({
    id: "linux-master",
    name: "리눅스마스터",
    type: "민간/기타",
    series: "시스템",
    field: "정보통신",
    subField: "정보기술",
    aliases: ["리눅스마스터 1급", "리눅스마스터 2급"],
  }),
  createFallbackQualification({
    id: "network-manager",
    name: "네트워크관리사",
    type: "민간/기타",
    series: "네트워크",
    field: "정보통신",
    subField: "정보기술",
    aliases: ["네트워크관리사 2급"],
  }),
  createFallbackQualification({
    id: "information-security-engineer",
    name: "정보보안기사",
    series: "기사",
    field: "정보통신",
    subField: "정보보안",
  }),
  createFallbackQualification({
    id: "craftsman-web-design",
    name: "웹디자인기능사",
    series: "기능사",
    field: "정보통신",
    subField: "정보기술",
  }),
  createFallbackQualification({
    id: "gtq",
    name: "GTQ",
    type: "민간/기타",
    series: "그래픽",
    field: "디자인",
    subField: "그래픽",
    aliases: ["그래픽기술자격", "GTQ 1급", "GTQ 2급"],
  }),
];

let qualificationCache = null;

const getApiKey = () => import.meta.env.VITE_PUBLIC_DATA_API_KEY || "";

const getTextContent = (item, tagName) =>
  item.getElementsByTagName(tagName)[0]?.textContent?.trim() || "";

const normalizeQualification = (item) => ({
  id: getTextContent(item, "jmcd") || getTextContent(item, "jmfldnm"),
  name: getTextContent(item, "jmfldnm"),
  type: getTextContent(item, "qualgbnm"),
  series: getTextContent(item, "seriesnm"),
  field: getTextContent(item, "obligfldnm"),
  subField: getTextContent(item, "mdobligfldnm"),
});

const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

const getSearchText = (qualification) =>
  normalizeText([
    qualification.name,
    ...(qualification.aliases || []),
  ].join(" "));

const filterQualifications = (qualifications, keyword) => {
  const normalizedKeyword = normalizeText(keyword);

  return qualifications
    .filter((qualification) => getSearchText(qualification).includes(normalizedKeyword))
    .slice(0, 12);
};

const createServiceKeyParam = (apiKey) => {
  const trimmedKey = apiKey.trim();
  return trimmedKey.includes("%") ? trimmedKey : encodeURIComponent(trimmedKey);
};

const mergeQualifications = (qualifications) => {
  const qualificationMap = new Map();

  [...qualifications, ...fallbackQualifications].forEach((qualification) => {
    const key = normalizeText(qualification.name);

    if (!qualificationMap.has(key)) {
      qualificationMap.set(key, qualification);
    }
  });

  return Array.from(qualificationMap.values());
};

const fetchQualifications = async () => {
  if (qualificationCache) {
    return qualificationCache;
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    qualificationCache = fallbackQualifications;
    return qualificationCache;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);
  const response = await fetch(
    `${QUALIFICATION_API_URL}?serviceKey=${createServiceKeyParam(apiKey)}`,
    { signal: controller.signal }
  );
  window.clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error("자격증 목록을 불러오지 못했습니다.");
  }

  const xmlText = await response.text();
  const document = new DOMParser().parseFromString(xmlText, "text/xml");
  const resultCode = document.getElementsByTagName("resultCode")[0]?.textContent;
  const resultMessage = document.getElementsByTagName("resultMsg")[0]?.textContent;
  const errorMessage = document.getElementsByTagName("errMsg")[0]?.textContent;

  if ((resultCode && resultCode !== "00") || errorMessage) {
    throw new Error(errorMessage || resultMessage || "자격증 API 응답이 정상적이지 않습니다.");
  }

  const items = Array.from(document.getElementsByTagName("item"));
  qualificationCache = mergeQualifications(
    items
      .map(normalizeQualification)
      .filter((qualification) => qualification.id && qualification.name)
  );

  if (qualificationCache.length === 0) {
    throw new Error("자격증 목록이 비어 있습니다.");
  }

  return qualificationCache;
};

export const searchQualifications = async (keyword) => {
  const normalizedKeyword = keyword.trim();

  if (normalizedKeyword.length < 2) {
    return [];
  }

  try {
    const qualifications = await fetchQualifications();
    return filterQualifications(qualifications, normalizedKeyword);
  } catch {
    return filterQualifications(fallbackQualifications, normalizedKeyword);
  }
};
