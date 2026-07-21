import { ApiError } from "../utils/ApiError.js";

// PROJECT.md 2-1 "인터뷰 항목" 순서를 그대로 따른다. 분기 없이 순서대로
// 진행되는 단일 흐름이라 promotionInterviewFlow.js보다 훨씬 단순하다.
const STEPS = [
  { id: "businessType", question: "어떤 업종이신가요?", type: "text", placeholder: "예: 디저트 카페" },
  { id: "storeName", question: "가게 이름이 어떻게 되나요?", type: "text", placeholder: "예: OO카페" },
  { id: "mainProduct", question: "대표 상품(서비스)은 무엇인가요?", type: "text", placeholder: "예: 티라미수, 아인슈페너" },
  { id: "targetCustomer", question: "주로 어떤 고객들이 찾아오시나요?", type: "text", placeholder: "예: 동네 주민, 20대 여성" },
  { id: "brandMood", question: "브랜드 분위기를 한마디로 표현한다면요?", type: "text", placeholder: "예: 아늑하고 친근한" },
  { id: "strength", question: "우리 가게만의 강점은 무엇인가요?", type: "text", placeholder: "예: 가성비 좋은 디저트" },
  { id: "tone", question: "원하는 말투가 있으신가요?", type: "text", placeholder: "예: 친근하고 다정한 말투" },
  { id: "goal", question: "홍보를 통해 이루고 싶은 목표는 무엇인가요?", type: "text", placeholder: "예: 신규 고객 유입" },
];

function toResponse(stepDef) {
  const { id, ...question } = stepDef;
  return { done: false, nextStep: id, ...question };
}

export function getNextBrandProfileStep(step) {
  if (!step) return toResponse(STEPS[0]);

  const idx = STEPS.findIndex((s) => s.id === step);
  if (idx === -1) throw new ApiError(400, "INVALID_STEP", `존재하지 않는 step입니다: ${step}`);

  const next = STEPS[idx + 1];
  return next ? toResponse(next) : { done: true, nextStep: null };
}
