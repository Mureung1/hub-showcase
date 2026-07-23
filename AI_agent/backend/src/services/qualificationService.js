import { env } from "../config/env.js";
import { createTtlCache } from "./cacheService.js";
import { normalizeText } from "./text.js";

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
    id: "sqld",
    name: "SQLD",
    type: "민간/기타",
    series: "데이터",
    field: "정보통신",
    subField: "데이터",
    aliases: ["SQL 개발자"],
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
    id: "big-data-engineer",
    name: "빅데이터분석기사",
    series: "기사",
    field: "정보통신",
    subField: "데이터",
  }),
  createFallbackQualification({
    id: "information-security-engineer",
    name: "정보보안기사",
    series: "기사",
    field: "정보통신",
    subField: "정보보안",
  }),
  createFallbackQualification({
    id: "electric-engineer",
    name: "전기기사",
    series: "기사",
    field: "전기·전자",
    subField: "전기",
  }),
  createFallbackQualification({
    id: "architecture",
    name: "건축기사",
    series: "기사",
    field: "건설",
    subField: "건축",
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
const qualificationSearchCache = createTtlCache({ ttlMs: env.searchCacheTtlMs });

const createServiceKeyParam = (apiKey) => {
  const trimmedKey = apiKey.trim();
  return trimmedKey.includes("%") ? trimmedKey : encodeURIComponent(trimmedKey);
};

const extractTag = (xml, tagName) => {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`));
  return match?.[1]?.trim() || "";
};

const normalizeQualification = (itemXml) => ({
  id: extractTag(itemXml, "jmcd") || extractTag(itemXml, "jmfldnm"),
  name: extractTag(itemXml, "jmfldnm"),
  type: extractTag(itemXml, "qualgbnm"),
  series: extractTag(itemXml, "seriesnm"),
  field: extractTag(itemXml, "obligfldnm"),
  subField: extractTag(itemXml, "mdobligfldnm"),
});

const getItems = (xmlText) =>
  Array.from(xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)).map(
    (match) => match[1]
  );

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

  if (!env.publicDataApiKey) {
    qualificationCache = fallbackQualifications;
    return qualificationCache;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `${QUALIFICATION_API_URL}?serviceKey=${createServiceKeyParam(env.publicDataApiKey)}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error("자격증 목록을 불러오지 못했습니다.");
    }

    const xmlText = await response.text();
    const resultCode = extractTag(xmlText, "resultCode");
    const resultMessage = extractTag(xmlText, "resultMsg");
    const errorMessage = extractTag(xmlText, "errMsg");

    if ((resultCode && resultCode !== "00") || errorMessage) {
      throw new Error(
        errorMessage || resultMessage || "자격증 API 응답이 정상적이지 않습니다."
      );
    }

    const qualifications = getItems(xmlText)
      .map(normalizeQualification)
      .filter((qualification) => qualification.id && qualification.name);

    qualificationCache = mergeQualifications(qualifications);

    if (qualificationCache.length === 0) {
      throw new Error("자격증 목록이 비어 있습니다.");
    }

    return qualificationCache;
  } catch (error) {
    console.warn(`Q-Net qualification API fallback: ${error.message}`);
    qualificationCache = fallbackQualifications;
    return qualificationCache;
  } finally {
    clearTimeout(timeoutId);
  }
};

const getSearchText = (qualification) =>
  normalizeText([
    qualification.name,
    qualification.type,
    qualification.series,
    qualification.field,
    qualification.subField,
    ...(qualification.aliases || []),
  ].join(" "));

export const searchQualifications = async (keyword = "") => {
  const trimmedKeyword = keyword.trim();

  if (trimmedKeyword.length < 2) {
    return [];
  }

  const normalizedKeyword = normalizeText(trimmedKeyword);

  return qualificationSearchCache.getOrSet(normalizedKeyword, async () => {
    const qualifications = await fetchQualifications();

    return qualifications
      .filter((qualification) => getSearchText(qualification).includes(normalizedKeyword))
      .slice(0, 12);
  });
};
