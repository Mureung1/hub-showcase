const SPEC_STORAGE_KEY = "careerMissionSpecs";
const ANALYSIS_STORAGE_KEY = "careerMissionAnalysis";

export const specFields = [
  { name: "targetRole", label: "목표 직무" },
  { name: "grade", label: "학년" },
  { name: "gpa", label: "학점" },
  { name: "certificates", label: "자격증 (선택)" },
  { name: "languageScore", label: "어학 점수 (선택)" },
  { name: "projects", label: "프로젝트 경험" },
  { name: "activities", label: "대외활동/인턴 경험" },
  { name: "skills", label: "보유 기술 / 활용 도구 (선택)" },
];

const optionalSpecFieldNames = new Set(["certificates", "languageScore", "skills"]);

export const initialSpec = specFields.reduce(
  (spec, field) => ({ ...spec, [field.name]: "" }),
  {}
);

const readStorageMap = (key) => {
  const storedValue = localStorage.getItem(key);

  if (!storedValue) {
    return {};
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    localStorage.removeItem(key);
    return {};
  }
};

const writeStorageMap = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getUserKey = (userId) => String(userId || "").trim();

export const getCareerSpec = (userId) => {
  const userKey = getUserKey(userId);

  if (!userKey) {
    return null;
  }

  return readStorageMap(SPEC_STORAGE_KEY)[userKey] || null;
};

export const saveCareerSpec = (userId, spec) => {
  const userKey = getUserKey(userId);

  if (!userKey) {
    return null;
  }

  const specsByUser = readStorageMap(SPEC_STORAGE_KEY);
  const nextSpec = {
    ...initialSpec,
    ...spec,
    updatedAt: new Date().toISOString(),
  };

  specsByUser[userKey] = nextSpec;
  writeStorageMap(SPEC_STORAGE_KEY, specsByUser);
  clearCareerAnalysis(userId);

  return nextSpec;
};

export const getCareerAnalysis = (userId) => {
  const userKey = getUserKey(userId);

  if (!userKey) {
    return null;
  }

  return readStorageMap(ANALYSIS_STORAGE_KEY)[userKey] || null;
};

export const saveCareerAnalysis = (userId, analysis) => {
  const userKey = getUserKey(userId);

  if (!userKey) {
    return null;
  }

  const analysisByUser = readStorageMap(ANALYSIS_STORAGE_KEY);
  const nextAnalysis = {
    ...analysis,
    analyzedAt: new Date().toISOString(),
  };

  analysisByUser[userKey] = nextAnalysis;
  writeStorageMap(ANALYSIS_STORAGE_KEY, analysisByUser);

  return nextAnalysis;
};

export const clearCareerAnalysis = (userId) => {
  const userKey = getUserKey(userId);

  if (!userKey) {
    return;
  }

  const analysisByUser = readStorageMap(ANALYSIS_STORAGE_KEY);
  delete analysisByUser[userKey];
  writeStorageMap(ANALYSIS_STORAGE_KEY, analysisByUser);
};

export const getMissingSpecFields = (spec) => {
  return specFields.filter(
    (field) =>
      !optionalSpecFieldNames.has(field.name) &&
      !String(spec?.[field.name] || "").trim()
  );
};

export const isCareerSpecComplete = (spec) => {
  return getMissingSpecFields(spec).length === 0;
};

const countItems = (value) => {
  return String(value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean).length;
};

const getTextScore = (value, maxScore) => {
  const length = String(value || "").trim().length;

  return Math.min(maxScore, Math.floor(length / 8));
};

export const createCareerAnalysis = ({ user, spec }) => {
  const gpa = Number.parseFloat(spec.gpa);
  const gpaScore = Number.isFinite(gpa) ? Math.min(12, Math.round((gpa / 4.5) * 12)) : 0;
  const certificateScore = Math.min(10, countItems(spec.certificates) * 4);
  const languageScore = Math.min(8, countItems(spec.languageScore) * 4);
  const projectScore = Math.min(18, countItems(spec.projects) * 6 + getTextScore(spec.projects, 6));
  const activityScore = Math.min(8, countItems(spec.activities) * 3 + getTextScore(spec.activities, 3));
  const skillScore = Math.min(12, countItems(spec.skills) * 2);
  const profileScore = user?.school && user?.major ? 5 : 0;
  const targetScore = spec.targetRole ? 5 : 0;
  const gradeScore = spec.grade ? 4 : 0;
  const readiness = Math.min(
    96,
    34 +
      profileScore +
      targetScore +
      gradeScore +
      gpaScore +
      certificateScore +
      languageScore +
      projectScore +
      activityScore +
      skillScore
  );

  const hasSkills = countItems(spec.skills) > 0;
  const hasCertificatesOrLanguage = certificateScore + languageScore > 0;

  const strengths = [
    projectScore >= 12 ? "프로젝트 경험이 목표 직무와 연결될 가능성이 높습니다." : null,
    hasSkills ? "보유 기술이나 활용 도구가 추가 역량 근거로 반영되었습니다." : null,
    hasCertificatesOrLanguage
      ? "자격증과 어학 정보가 선택 역량 근거로 활용됩니다."
      : null,
  ].filter(Boolean);

  const gaps = [
    projectScore < 12 ? "프로젝트 경험을 더 구체적으로 적으면 준비도가 올라갑니다." : null,
  ].filter(Boolean);

  return {
    readiness,
    targetRole: spec.targetRole,
    fitLevel: readiness >= 82 ? "높음" : readiness >= 68 ? "보통" : "보완 필요",
    portfolioLevel: projectScore >= 12 ? "준비됨" : "보완 필요",
    burnoutLevel: activityScore >= 6 ? "관리 필요" : "낮음",
    strengths: strengths.length ? strengths : ["기본 프로필과 목표 직무가 분석에 반영되었습니다."],
    gaps: gaps.length ? gaps : ["다음 단계는 미션 결과물을 포트폴리오로 정리하는 것입니다."],
  };
};
