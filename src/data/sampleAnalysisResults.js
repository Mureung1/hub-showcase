import { normalizeAnalysisResult } from "../utils/normalizeAnalysisResult.js";

const baseOpportunity = {
  title: null,
  organizer: null,
  category: "unknown",
  deadline: null,
  target: null,
  eligibility: [],
  preferred: [],
  requiredDocuments: [],
  benefits: [],
  activityPeriod: null,
  sourceUrl: null,
  uncertainFields: [],
};

const baseMatch = {
  status: "insufficient_info",
  score: null,
  summary: "",
  matchedReasons: [],
  missingInfo: [],
  disqualifyingReasons: [],
  nextActions: [],
};

function createSample(id, opportunity, match, tasks = []) {
  return normalizeAnalysisResult({
    id,
    analyzedAt: "2026-07-13T00:00:00.000Z",
    mode: "mock",
    opportunity: { ...baseOpportunity, ...opportunity },
    match: { ...baseMatch, ...match },
    tasks,
  });
}

export const sampleAnalysisResults = Object.freeze([
  createSample(
    "sample-eligible-contest",
    {
      title: "2026 AI 소프트웨어 공모전",
      organizer: "한국소프트웨어진흥원",
      category: "contest",
      deadline: "2026-08-31",
      target: "전국 대학교 2학년 이상 재학생",
      eligibility: [{
        type: "grade",
        condition: "2학년 이상",
        evidence: "전국 대학교 2학년 이상 재학생",
        required: true,
      }],
      requiredDocuments: ["참가신청서", "프로젝트 계획서", "재학증명서"],
      benefits: ["대상 300만원", "우수상 100만원"],
      sourceUrl: "https://example.com/notices/ai-contest",
    },
    {
      status: "eligible",
      score: 90,
      summary: "학년과 관심 분야 조건을 충족합니다.",
      matchedReasons: ["2학년 이상 조건을 충족합니다.", "AI 관심 분야와 일치합니다."],
      nextActions: ["프로젝트 계획서 초안을 작성하세요."],
    },
  ),
  createSample(
    "sample-conditional-scholarship",
    {
      title: "지역인재 장학금",
      organizer: "미래인재재단",
      category: "scholarship",
      target: "대구 지역 대학 재학생",
      uncertainFields: ["마감일", "소득 기준"],
    },
    {
      status: "conditionally_eligible",
      score: 68,
      summary: "지역 조건은 맞지만 소득 기준 확인이 필요합니다.",
      matchedReasons: ["대구 지역 대학 재학생 조건과 일치합니다."],
      missingInfo: ["소득 기준", "마감일"],
      nextActions: ["재단 공고에서 소득 기준과 마감일을 확인하세요."],
    },
  ),
  createSample(
    "sample-not-eligible-region",
    {
      title: "서울 청년 지원사업",
      organizer: "서울청년센터",
      category: "support",
      deadline: "2026-09-10",
      target: "서울 거주 대학생",
      eligibility: [{
        type: "region",
        condition: "서울 거주",
        evidence: "서울 거주 대학생",
        required: true,
      }],
    },
    {
      status: "not_eligible",
      score: 20,
      summary: "필수 지역 조건과 사용자 프로필이 맞지 않습니다.",
      disqualifyingReasons: ["서울 거주 필수 조건을 충족하지 않습니다."],
      nextActions: ["거주 지역 제한이 없는 지원사업을 확인하세요."],
    },
  ),
  createSample(
    "sample-insufficient-info",
    {
      title: "대학생 대외활동 참가자 모집",
      category: "activity",
      uncertainFields: ["주최 기관", "마감일", "지원 대상", "혜택"],
    },
    {
      status: "insufficient_info",
      summary: "지원 여부를 판단할 공고 정보가 부족합니다.",
      missingInfo: ["지원 대상", "마감일"],
      nextActions: ["공고 원문에서 세부 정보를 확인하세요."],
    },
  ),
]);
