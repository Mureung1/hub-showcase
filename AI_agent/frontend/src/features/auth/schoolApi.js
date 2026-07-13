import {
  mockMajorsByUniversity,
  mockUniversities,
} from "../../data/mockEducationData";

const CAREER_NET_API_URL = "https://www.career.go.kr/cnet/openapi/getOpenApi";
const CAREER_NET_UNIVERSITY_GUBUN = "univ_list";

const getApiKey = () => import.meta.env.VITE_CAREER_NET_API_KEY || "";

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

const createBaseParams = (apiKey, svcCode) =>
  new URLSearchParams({
    apiKey,
    svcType: "api",
    svcCode,
    contentType: "json",
    gubun: CAREER_NET_UNIVERSITY_GUBUN,
  });

export const searchUniversities = async (keyword) => {
  const apiKey = getApiKey();
  const normalizedKeyword = keyword.trim();

  if (!apiKey) {
    return mockUniversities
      .filter((school) => school.name.includes(normalizedKeyword))
      .slice(0, 8);
  }

  const params = createBaseParams(apiKey, "SCHOOL");
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
  const apiKey = getApiKey();
  const params = createBaseParams(apiKey, "MAJOR_VIEW");
  params.set("majorSeq", majorSeq);

  const response = await fetch(`${CAREER_NET_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error("학과 상세 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  return data?.dataSearch?.content;
};

export const searchMajorsBySchool = async ({ keyword, schoolName }) => {
  const apiKey = getApiKey();
  const normalizedKeyword = keyword.trim();

  if (!apiKey) {
    const selectedSchool = mockUniversities.find(
      (school) => school.name === schoolName
    );
    const majors = mockMajorsByUniversity[schoolName] || [];

    return majors
      .filter((majorName) => majorName.includes(normalizedKeyword))
      .slice(0, 8)
      .map((majorName) => ({
        id: `mock-${schoolName}-${majorName}`,
        name: majorName,
        schoolName,
        campus: selectedSchool?.campus || "본교",
        area: selectedSchool?.region || "",
      }));
  }

  const params = createBaseParams(apiKey, "MAJOR");
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
        id: `career-net-major-${schoolName}-${majorName}`,
        name: majorName,
        schoolName,
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
          university.schoolName === schoolName &&
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

  const mergedMajors = majors.length > 0 ? majors : fallbackMajors;

  return getUniqueMajors(mergedMajors).slice(0, 8);
};
