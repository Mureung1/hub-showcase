import {
  mockMajorsByUniversity,
  mockUniversities,
} from "../../data/mockEducationData";

const CAREER_NET_SCHOOL_API_URL =
  "https://www.career.go.kr/cnet/openapi/getOpenApi";

const getApiKey = () => import.meta.env.VITE_CAREER_NET_API_KEY || "";

const normalizeContent = (content) => {
  if (!content) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
};

export const searchUniversities = async (keyword) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    return mockUniversities
      .filter((school) => school.name.includes(keyword))
      .slice(0, 8);
  }

  const params = new URLSearchParams({
    apiKey,
    svcType: "api",
    svcCode: "SCHOOL",
    contentType: "json",
    gubun: "대학교",
    searchSchulNm: keyword,
    perPage: "8",
    thisPage: "1",
  });

  const response = await fetch(`${CAREER_NET_SCHOOL_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error("학교 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  const contents = normalizeContent(data?.dataSearch?.content);

  return contents.map((school) => ({
    id: `${school.seq}-${school.campusName || "main"}`,
    name: school.schoolName,
    type: school.schoolType || school.schoolGubun,
    region: school.region,
    address: school.adres,
    campus: school.campusName,
  }));
};

const fetchMajorDetail = async (majorSeq) => {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    apiKey,
    svcType: "api",
    svcCode: "MAJOR_VIEW",
    contentType: "json",
    gubun: "대학교",
    majorSeq,
  });

  const response = await fetch(`${CAREER_NET_SCHOOL_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error("학과 상세 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  return data?.dataSearch?.content;
};

export const searchMajorsBySchool = async ({ keyword, schoolName }) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    const selectedSchool = mockUniversities.find(
      (school) => school.name === schoolName
    );
    const majors = mockMajorsByUniversity[schoolName] || [];

    return majors
      .filter((majorName) => majorName.includes(keyword))
      .slice(0, 8)
      .map((majorName) => ({
        id: `mock-${schoolName}-${majorName}`,
        name: majorName,
        schoolName,
        campus: selectedSchool?.campus || "본교",
        area: selectedSchool?.region || "",
      }));
  }

  const params = new URLSearchParams({
    apiKey,
    svcType: "api",
    svcCode: "MAJOR",
    contentType: "json",
    gubun: "대학교",
    searchTitle: keyword,
    perPage: "8",
    thisPage: "1",
  });

  const response = await fetch(`${CAREER_NET_SCHOOL_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error("학과 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  const majorList = normalizeContent(data?.dataSearch?.content);
  const detailList = await Promise.all(
    majorList
      .filter((major) => major.majorSeq)
      .map((major) => fetchMajorDetail(major.majorSeq))
  );

  const majors = detailList.flatMap((detail) => {
    const universities = normalizeContent(detail?.university?.content);

    return universities
      .filter((university) => university.schoolName === schoolName)
      .map((university) => ({
        id: `${university.schoolName}-${university.majorName}-${university.campus_nm}`,
        name: university.majorName,
        schoolName: university.schoolName,
        campus: university.campus_nm,
        area: university.area,
      }));
  });

  return Array.from(
    new Map(majors.map((major) => [major.id, major])).values()
  );
};
