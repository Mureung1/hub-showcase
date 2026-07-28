const JOB_TYPE_LABELS = {
  NEW: "신입",
  EXPERIENCED: "경력",
  INTERN: "인턴",
  ETC: "기타",
};

const GENERIC_ESSAY_QUESTIONS = [
  { question: "지원 동기를 작성해주세요.", maxLength: 500 },
  { question: "관련 경험과 역량을 작성해주세요.", maxLength: 500 },
];

export function extractActivityIds(listingHtml) {
  const matches = listingHtml.matchAll(/href="\/activity\/(\d+)"/g);
  const ids = [];
  const seen = new Set();
  for (const match of matches) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function extractNextData(detailHtml) {
  const match = detailHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("__NEXT_DATA__ 스크립트를 찾을 수 없습니다.");
  }
  return JSON.parse(match[1]);
}

export function extractActivity(nextData) {
  return nextData?.props?.pageProps?.data?.activityData?.activity ?? null;
}

function formatDate(epochMs) {
  if (!epochMs) return null;
  return new Date(epochMs).toISOString().slice(0, 10);
}

function buildField(activity) {
  const dutyCategories = activity.duties?.nodes?.[0]?.categories ?? [];
  if (dutyCategories.length > 0) {
    return dutyCategories.map((c) => c.name).join(" / ");
  }
  const rootNames = (activity.rootCategories ?? []).map((c) => c.name);
  return rootNames.length > 0 ? rootNames.join(" / ") : "분야 미기재";
}

function buildTarget(activity) {
  const dutyJobTypes = (activity.duties?.nodes ?? []).map((d) => d.jobType).filter(Boolean);
  const jobTypes = dutyJobTypes.length > 0 ? dutyJobTypes : activity.jobTypes ?? [];
  const labels = [...new Set(jobTypes.map((t) => JOB_TYPE_LABELS[t] ?? t))];
  return labels.length > 0 ? labels.join("/") : "상세 페이지 참고";
}

function buildConditions(activity) {
  const conditions = [];
  const districtNames = (activity.regionDistricts ?? []).map((d) => d.name);
  const regionNames = districtNames.length > 0 ? districtNames : (activity.regions ?? []).map((r) => r.name);
  if (regionNames.length > 0) {
    conditions.push(`근무지역: ${regionNames.join(", ")}`);
  }
  if (activity.organizationType) {
    conditions.push(`기업형태: ${activity.organizationType}`);
  }
  return conditions;
}

function buildKeywords(activity) {
  const dutyCategoryNames = (activity.duties?.nodes ?? []).flatMap((d) => (d.categories ?? []).map((c) => c.name));
  const rootNames = (activity.rootCategories ?? []).map((c) => c.name);
  return [...new Set([...dutyCategoryNames, ...rootNames])];
}

function buildEssayQuestions(activity) {
  const templates = (activity.duties?.nodes ?? []).flatMap((d) => d.questionTemplates ?? []);
  if (templates.length === 0) {
    return GENERIC_ESSAY_QUESTIONS;
  }
  return templates.map((t) => ({
    question: t.content.trim(),
    maxLength: t.charMaxSize,
  }));
}

export function isTestPosting(activity) {
  return /테스트/.test(activity.title) || /테스트/.test(activity.organizationName ?? "");
}

// 일부 실제 공고는 문항이 9~12개에 총 글자수 제한 합계가 수만 자에 달해, 초안 생성 호출
// 한 번으로 감당하기 어렵고(모델 응답 max_tokens 상한 초과) 자소서 초안 화면 UX로도
// 지나치게 무겁다. 데모에 쓰기에 무리 없는 범위로 걸러낸다.
const MAX_ESSAY_QUESTIONS = 6;
const MAX_ESSAY_TOTAL_LENGTH = 8000;

export function hasReasonableEssayLoad(essayQuestions) {
  const totalLength = essayQuestions.reduce((sum, q) => sum + q.maxLength, 0);
  return essayQuestions.length <= MAX_ESSAY_QUESTIONS && totalLength <= MAX_ESSAY_TOTAL_LENGTH;
}

export function mapActivityToPosting(activity, { id, category }) {
  return {
    id,
    category,
    org: activity.organizationName,
    title: activity.title,
    deadline: formatDate(activity.recruitCloseAt) ?? formatDate(activity.activityEndAt),
    field: buildField(activity),
    target: buildTarget(activity),
    applyMethod: activity.applyDetail || activity.homepageURL || "홈페이지 지원 페이지 참고",
    conditions: buildConditions(activity),
    keywords: buildKeywords(activity),
    gpaMin: 0,
    essayQuestions: buildEssayQuestions(activity),
  };
}

export { GENERIC_ESSAY_QUESTIONS };
