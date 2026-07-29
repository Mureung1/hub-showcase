import { ApiError } from "../utils/ApiError.js";
import { generateJson } from "./llmClient.js";

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

const SYSTEM_PROMPT = `당신은 소상공인의 브랜드 온보딩 인터뷰 답변을 읽고 브랜드 요약을 정리하는 한국어 카피라이터입니다.
- 인터뷰 답변에 나온 사실(업종, 타겟 고객, 강점 등)만 사용하고 새로운 사실을 지어내지 않습니다.
- summary는 한 문장으로, 이 가게를 처음 보는 사람도 바로 이해할 수 있게 씁니다.
- keywords는 이 브랜드를 대표하는 짧은 단어/구 3~5개 배열입니다.`;

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "keywords"],
  additionalProperties: false,
};

function requireFields(answers) {
  const missing = REQUIRED_FIELDS.filter((field) => !answers[field]);
  if (missing.length > 0) {
    throw new ApiError(400, "MISSING_FIELDS", `다음 답변이 필요합니다: ${missing.join(", ")}`);
  }
}

export async function buildBrandProfileSummary(answers) {
  requireFields(answers);
  const { businessType, storeName, mainProduct, targetCustomer, brandMood, strength, tone, goal } = answers;

  return generateJson({
    system: SYSTEM_PROMPT,
    schema: SUMMARY_SCHEMA,
    user: `다음 인터뷰 답변으로 브랜드 요약과 키워드를 만들어주세요.
- 업종: ${businessType}
- 가게 이름: ${storeName}
- 주요 상품: ${mainProduct}
- 타겟 고객: ${targetCustomer}
- 브랜드 무드: ${brandMood}
- 강점: ${strength}
- 톤앤매너: ${tone}
- 목표: ${goal}`,
  });
}
