import { ApiError } from "../utils/ApiError.js";

// LLM 연동 전(Day18) 임시 규칙 기반 생성 — postContent.js와 동일한 수준의
// 최소 뼈대. summary는 "고객층이 자주 찾는 강점 + 업종" 틀에 답변을 끼워 넣는다.
const REQUIRED_FIELDS = [
  "businessType",
  "storeName",
  "mainProduct",
  "targetCustomer",
  "brandMood",
  "strength",
  "tone",
  "goal",
];

function requireFields(answers) {
  const missing = REQUIRED_FIELDS.filter((field) => !answers[field]);
  if (missing.length > 0) {
    throw new ApiError(400, "MISSING_FIELDS", `다음 답변이 필요합니다: ${missing.join(", ")}`);
  }
}

export function buildBrandProfileSummary(answers) {
  requireFields(answers);
  const { targetCustomer, strength, businessType, brandMood } = answers;

  return {
    summary: `${targetCustomer}이 자주 찾는 ${strength} ${businessType}`,
    keywords: [brandMood, strength, businessType].filter(Boolean),
  };
}
