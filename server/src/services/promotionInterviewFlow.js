import { ApiError } from "../utils/ApiError.js";

// my-app/src/pages/PromotionInterview.jsx의 STEPS_BY_PURPOSE를 그대로 옮겨왔다.
// 지금은 프론트가 이 인터뷰를 자체적으로 갖고 있어서 이 엔드포인트를 호출하지
// 않는다 — api-spec.md 명세를 지키기 위해 먼저 구현해둔 것. Day8~9에 프론트를
// 실제 API로 연결할 때 두 곳 중 한쪽(서버 쪽이 유력)으로 소스를 합쳐야 한다.
const PURPOSE_OPTIONS = [
  {
    value: "new-menu",
    label: "신메뉴",
    description: "새롭게 출시된 메뉴나 상품을 소개하고 싶을 때",
  },
  {
    value: "event",
    label: "이벤트 / 할인",
    description: "기간 한정 프로모션, 쿠폰, 특별 행사를 홍보할 때",
  },
  {
    value: "general",
    label: "일반 홍보",
    description: "매장의 분위기, 서비스, 위치 등 전반적인 소식을 알릴 때",
  },
];

const STEP_FLOW = {
  "new-menu": [
    {
      id: "menu-name",
      question: "신메뉴 이름을 알려주세요",
      type: "text",
      placeholder: "예: 아이스 아메리카노",
    },
    { id: "photo", question: "사진을 업로드해주세요", type: "photo" },
    { id: "launch-date", question: "언제부터 판매하시나요?", type: "date" },
  ],
  event: [
    {
      id: "event-name",
      question: "이벤트/할인 이름을 알려주세요",
      type: "text",
      placeholder: "예: 여름 시즌 빙수 20% 할인",
    },
    {
      id: "event-type",
      question: "어떤 이벤트인가요?",
      type: "choice",
      options: [
        { value: "price-discount", label: "가격 할인" },
        { value: "buy-one-get-one", label: "1+1 · 증정" },
        { value: "coupon-point", label: "쿠폰 · 적립 혜택" },
        { value: "bundle", label: "세트 · 묶음 할인" },
        { value: "seasonal", label: "시즌 이벤트" },
      ],
    },
    {
      id: "event-detail",
      question: "상세 내용을 알려주세요",
      type: "text",
      placeholder: "예: 아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상",
    },
    { id: "event-period", question: "진행 기간이 언제인가요?", type: "date-range" },
    { id: "photo", question: "사진을 업로드해주세요", type: "photo" },
  ],
  general: [
    {
      id: "general-topic",
      question: "무엇에 대한 이야기인가요?",
      type: "choice",
      options: [
        { value: "atmosphere", label: "매장 분위기 · 인테리어" },
        { value: "service", label: "서비스 · 직원 소개" },
        { value: "location", label: "위치 · 오시는 길" },
        { value: "brand-story", label: "브랜드 스토리" },
        { value: "etc", label: "기타" },
      ],
    },
    {
      id: "general-detail",
      question: "하고 싶은 이야기를 자유롭게 적어주세요",
      type: "text",
      placeholder: "예: 이번에 매장 인테리어를 리뉴얼했어요",
    },
    { id: "photo", question: "사진을 업로드해주세요", type: "photo" },
  ],
};

function toResponse(stepDef) {
  const { id, ...question } = stepDef;
  return { done: false, nextStep: id, ...question };
}

// "photo"처럼 여러 분기가 같은 step id를 공유하기 때문에(프론트와 동일하게
// 사진 질문을 재사용), step만으로는 어느 분기인지 알 수 없다. 그래서 purpose
// 답변 이후의 모든 호출은 purpose를 함께 받아 분기를 명시적으로 지정한다.
export function getNextPromotionStep(step, answer, purpose) {
  if (!step) {
    return {
      done: false,
      nextStep: "purpose",
      question: "무엇을 홍보하시나요?",
      type: "choice",
      options: PURPOSE_OPTIONS,
    };
  }

  if (step === "purpose") {
    if (!STEP_FLOW[answer]) {
      throw new ApiError(
        400,
        "INVALID_ANSWER",
        "purpose 답변은 new-menu/event/general 중 하나여야 합니다."
      );
    }
    return toResponse(STEP_FLOW[answer][0]);
  }

  if (!STEP_FLOW[purpose]) {
    throw new ApiError(
      400,
      "MISSING_PURPOSE",
      "purpose 단계 이후에는 어느 분기인지 알 수 있도록 purpose를 함께 보내야 합니다."
    );
  }

  const steps = STEP_FLOW[purpose];
  const idx = steps.findIndex((s) => s.id === step);
  if (idx === -1) {
    throw new ApiError(400, "INVALID_STEP", `${purpose} 흐름에 존재하지 않는 step입니다: ${step}`);
  }

  const next = steps[idx + 1];
  return next ? toResponse(next) : { done: true, nextStep: null };
}
