import { env } from "../config/env.js";
import { createTtlCache } from "./cacheService.js";
import { normalizeText } from "./text.js";

const CAREER_NET_API_URL = "https://www.career.go.kr/cnet/openapi/getOpenApi";
const UNIVERSITY_GUBUN = "univ_list";
const MAJOR_PAGE_SIZE = 100;
const MAX_MAJOR_PAGES = 10;
const universitySearchCache = createTtlCache({ ttlMs: env.searchCacheTtlMs });
const majorSearchCache = createTtlCache({ ttlMs: env.searchCacheTtlMs });

const fallbackUniversities = [
  {
    id: "mock-jeonbuk-main",
    name: "전북대학교",
    type: "일반대학",
    region: "전북특별자치도",
    address: "전북특별자치도 전주시 덕진구 백제대로 567",
    campus: "본교",
  },
  {
    id: "mock-snu-main",
    name: "서울대학교",
    type: "일반대학",
    region: "서울특별시",
    address: "서울특별시 관악구 관악로 1",
    campus: "본교",
  },
  {
    id: "mock-yonsei-main",
    name: "연세대학교",
    type: "일반대학",
    region: "서울특별시",
    address: "서울특별시 서대문구 연세로 50",
    campus: "신촌캠퍼스",
  },
];

const fallbackMajors = [
  "컴퓨터공학부",
  "소프트웨어공학과",
  "전자공학부",
  "경영학과",
  "통계학과",
  "인공지능학과",
];

const normalizeContent = (content) => {
  if (!content) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
};

const getUniqueMajors = (majors) =>
  Array.from(new Map(majors.map((major) => [normalizeText(major.name), major])).values());

const getMajorNameCandidates = (major) =>
  [major.majorName, major.major, major.department, major.mClass, major.facilName]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const includesNormalized = (value, keyword) => {
  const normalizedValue = normalizeText(value);
  const normalizedKeyword = normalizeText(keyword);

  return (
    normalizedValue.includes(normalizedKeyword) ||
    normalizedKeyword.includes(normalizedValue)
  );
};

const createBaseParams = (svcCode) =>
  new URLSearchParams({
    apiKey: env.careerNetApiKey,
    svcType: "api",
    svcCode,
    contentType: "json",
    gubun: UNIVERSITY_GUBUN,
  });

export const searchUniversities = async (keyword = "") => {
  const normalizedKeyword = keyword.trim();
  const cacheKey = normalizeText(normalizedKeyword);

  return universitySearchCache.getOrSet(cacheKey, async () => {
    if (!env.careerNetApiKey) {
      return fallbackUniversities
        .filter((school) => school.name.includes(normalizedKeyword))
        .slice(0, 8);
    }

    const params = createBaseParams("SCHOOL");
    params.set("searchSchulNm", normalizedKeyword);
    params.set("perPage", "8");
    params.set("thisPage", "1");

    const response = await fetch(`${CAREER_NET_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error("학교 정보를 불러오지 못했습니다.");
    }

    const data = await response.json();
    const contents = normalizeContent(data?.dataSearch?.content);

    return contents.map((school) => ({
      id: `${school.seq || school.schoolName}-${school.campusName || "main"}`,
      name: school.schoolName,
      type: school.schoolType || school.schoolGubun,
      region: school.region,
      address: school.adres,
      campus: school.campusName,
    }));
  });
};

const fetchCareerNetMajorPage = async (page) => {
  const params = createBaseParams("MAJOR");
  params.set("perPage", String(MAJOR_PAGE_SIZE));
  params.set("thisPage", String(page));

  const response = await fetch(`${CAREER_NET_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error("학과 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  return normalizeContent(data?.dataSearch?.content);
};

const fetchCareerNetMajors = async () => {
  const majors = [];

  for (let page = 1; page <= MAX_MAJOR_PAGES; page += 1) {
    const pageMajors = await fetchCareerNetMajorPage(page);
    majors.push(...pageMajors);

    if (pageMajors.length < MAJOR_PAGE_SIZE) {
      break;
    }
  }

  return majors;
};

const createMajorResult = ({ name, schoolName, category, source }) => ({
  id: `${source}-${normalizeText(name)}`,
  name,
  schoolName: "",
  campus: "커리어넷 전공 목록",
  area: category || schoolName,
  source,
});

export const searchMajorsBySchool = async ({ keyword = "", schoolName = "" }) => {
  const normalizedKeyword = keyword.trim();

  if (!normalizedKeyword) {
    return [];
  }

  const cacheKey = `${normalizeText(schoolName)}:${normalizeText(normalizedKeyword)}`;

  return majorSearchCache.getOrSet(cacheKey, async () => {
    if (!env.careerNetApiKey) {
      return fallbackMajors
        .filter((majorName) => includesNormalized(majorName, normalizedKeyword))
        .map((majorName) =>
          createMajorResult({
            name: majorName,
            schoolName,
            category: "개발용 예시",
            source: "fallback-major",
          })
        );
    }

    const majorList = await fetchCareerNetMajors();
    const results = majorList.flatMap((major) =>
      getMajorNameCandidates(major)
        .filter((majorName) => includesNormalized(majorName, normalizedKeyword))
        .map((majorName) =>
          createMajorResult({
            name: majorName,
            schoolName,
            category: major.lClass || major.mClass,
            source: "career-net-major",
          })
        )
    );

    return getUniqueMajors(results).slice(0, 20);
  });
};
