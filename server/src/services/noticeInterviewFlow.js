import { ApiError } from "../utils/ApiError.js";

// my-app/src/pages/NoticeWrite.jsx의 STEPS를 그대로 옮겨왔다. 프로모션과 마찬가지로
// 지금은 프론트가 이 인터뷰를 자체적으로 갖고 있어서 이 엔드포인트를 호출하지
// 않는다 — api-spec.md 명세를 지키기 위해 먼저 구현해둔 것.
const STEPS = [
  {
    id: "type",
    question: "어떤 공지를 작성하시나요?",
    type: "choice",
    options: [
      {
        value: "day-off",
        label: "휴무 안내",
        description: "정기 휴무, 임시 휴업 등 일정을 안내합니다.",
      },
      {
        value: "hours-change",
        label: "영업시간 변경",
        description: "오픈/마감 시간 변경 및 브레이크 타임을 안내합니다.",
      },
      {
        value: "sold-out",
        label: "품절 안내",
        description: "인기 메뉴의 조기 소진이나 재료 수급 문제를 안내합니다.",
      },
      {
        value: "etc",
        label: "기타 공지",
        description: "이벤트, 신메뉴 출시 등 그 외 소식을 자유롭게 작성합니다.",
      },
    ],
  },
  {
    id: "content",
    question: "공지 내용을 자유롭게 적어주세요",
    type: "content",
    placeholder: "예: 7월 20일은 내부 시설 점검으로 임시 휴무입니다.",
  },
];

function toResponse(stepDef) {
  const { id, ...question } = stepDef;
  return { done: false, nextStep: id, ...question };
}

export function getNextNoticeStep(step) {
  if (!step) {
    return toResponse(STEPS[0]);
  }

  const idx = STEPS.findIndex((s) => s.id === step);
  if (idx === -1) {
    throw new ApiError(400, "INVALID_STEP", `존재하지 않는 step입니다: ${step}`);
  }

  const next = STEPS[idx + 1];
  return next ? toResponse(next) : { done: true, nextStep: null };
}
