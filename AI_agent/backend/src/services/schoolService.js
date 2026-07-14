import { env } from "../config/env.js";

const CAREER_NET_API_URL = "https://www.career.go.kr/cnet/openapi/getOpenApi";
const UNIVERSITY_GUBUN = "univ_list";

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

const fallbackMajorsByUniversity = {
  전북대학교: ["컴퓨터공학부", "소프트웨어공학과", "전자공학부", "경영학과"],
  서울대학교: ["컴퓨터공학부", "전기정보공학부", "경영학과", "통계학과"],
  연세대학교: ["컴퓨터과학과", "인공지능학과", "경영학과", "응용통계학과"],
};

const normalizeContent = (content) => {
  if (!content) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
};

const getUniqueMajors = (majors) =>
  Array.from(new Map(majors.map((major) => [major.id, major])).values());

const getMajorNameCandidates = (major) =>
  [major.mClass, major.facilName]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

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
};

const fetchMajorDetail = async (majorSeq) => {
  const params = createBaseParams("MAJOR_VIEW");
  params.set("majorSeq", majorSeq);

  const response = await fetch(`${CAREER_NET_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error("학과 상세 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  return data?.dataSearch?.content;
};

export const searchMajorsBySchool = async ({ keyword = "", schoolName = "" }) => {
  const normalizedKeyword = keyword.trim();
  const normalizedSchoolName = schoolName.trim();

  if (!env.careerNetApiKey) {
    const selectedSchool = fallbackUniversities.find(
      (school) => school.name === normalizedSchoolName
    );
    const majors = fallbackMajorsByUniversity[normalizedSchoolName] || [];

    return majors
      .filter((majorName) => majorName.includes(normalizedKeyword))
      .slice(0, 8)
      .map((majorName) => ({
        id: `mock-${normalizedSchoolName}-${majorName}`,
        name: majorName,
        schoolName: normalizedSchoolName,
        campus: selectedSchool?.campus || "본교",
        area: selectedSchool?.region || "",
      }));
  }

  const params = createBaseParams("MAJOR");
  params.set("searchTitle", normalizedKeyword);
  params.set("perPage", "20");
  params.set("thisPage", "1");

  const response = await fetch(`${CAREER_NET_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error("학과 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  const majorList = normalizeContent(data?.dataSearch?.content);
  const fallbackMajors = getUniqueMajors(
    majorList
      .flatMap((major) => getMajorNameCandidates(major))
      .filter((majorName) => majorName.includes(normalizedKeyword))
      .map((majorName) => ({
        id: `career-net-major-${normalizedSchoolName}-${majorName}`,
        name: majorName,
        schoolName: normalizedSchoolName,
        campus: "학과 목록",
        area: "",
      }))
  );

  const detailResults = await Promise.allSettled(
    majorList
      .filter((major) => major.majorSeq)
      .map((major) => fetchMajorDetail(major.majorSeq))
  );
  const detailList = detailResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const majors = detailList.flatMap((detail) => {
    const universities = normalizeContent(
      detail?.university?.content ?? detail?.university
    );

    return universities
      .filter(
        (university) =>
          university.schoolName === normalizedSchoolName &&
          university.majorName?.includes(normalizedKeyword)
      )
      .map((university) => ({
        id: `${university.schoolName}-${university.majorName}-${university.campus_nm}`,
        name: university.majorName,
        schoolName: university.schoolName,
        campus: university.campus_nm,
        area: university.area,
      }));
  });

  return getUniqueMajors(majors.length > 0 ? majors : fallbackMajors).slice(0, 8);
};
