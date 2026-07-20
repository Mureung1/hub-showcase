// 레벨별 넛지 본문 생성기. content-as-data: 문구 목록은 배열로, 레벨→빌더 매핑은
// 객체로 분리해두고 컴포넌트(NudgeMessage.jsx)는 매핑 결과만 렌더링한다.
//
// 빌더 함수 시그니처는 wireframe.md 4번(잔소리봇 개입 모달)이 명시한
// { reason, type, title, skipCount, deadline }로 레벨과 무관하게 고정해둔다 —
// Lv2~4가 reason/type/deadline을 쓰게 되어도 NudgeModal/NudgeMessage는 건드릴 필요 없이
// 이 파일에 항목만 추가하면 되게 하기 위함.
import { getMicrotask } from "./microtask.js";

// Lv1: plan.md 3번 시나리오("회피 이유를 다시 확인하고, 가볍게 시작을 독려한다") 기준.
// 회피 이유 재확인은 ReasonCheckpoint가 이미 담당하므로 여기서는 마이크로태스크 없이
// 가벼운 톤의 시작 독려 문구만 둔다. 여러 개를 두고 skipCount로 로테이션해
// 매번 같은 문구가 반복되지 않게 한다(microtaskTemplates.js와 동일한 패턴).
export const LV1_MESSAGES = [
  "아직 시작 못 하셨네요. 지금 딱 한 걸음만 떼어볼까요?",
  "살짝 미뤄지고 있어요. 가볍게 한 번 시작해볼까요?",
  "아직이네요. 부담 갖지 말고 살짝만 움직여볼까요?",
];

// Lv2: plan.md 3번 시나리오("유형과 회피 이유를 기반으로 현재 상황에 맞는 첫 행동을
// 제안한다") 기준. 본문 앞부분은 유형/이유에 맞춰 제안한다는 톤만 담고, 실제 마이크로태스크는
// getMicrotask()가 만든 문구를 그대로 이어붙인다 — 두 곳에서 마이크로태스크 문구를
// 따로 만들지 않기 위함(#20 microtaskTemplates.js 재사용).
const LV2_LEAD_INS = [
  "지금 상황엔 이 정도로 시작해보는 게 좋을 것 같아요.",
  "이유를 보니, 이렇게 작게 시작해보는 게 딱 맞을 것 같아요.",
];

// { [level]: (input) => { body, microtask } } — microtask는 Lv1에서 항상 null이고,
// Lv2부터 실제 마이크로태스크 문구가 채워질 자리.
export const NUDGE_MESSAGE_BUILDERS = {
  1: ({ skipCount }) => ({
    body: LV1_MESSAGES[skipCount % LV1_MESSAGES.length],
    microtask: null,
  }),
  2: ({ type, reason, skipCount }) => {
    const microtask = getMicrotask({ type, reason });
    return {
      body: `${LV2_LEAD_INS[skipCount % LV2_LEAD_INS.length]} ${microtask}`,
      microtask,
    };
  },
  // 3: Lv3 근거 기반 개입(기억 기반 개입) — 다음 이슈에서 채운다.
  // 4: Lv4 마감 임박 경고 — 다음 이슈에서 채운다.
};

// task 객체에서 빌더 입력값을 뽑아 해당 레벨의 문구를 만든다.
// 아직 채워지지 않은 레벨(2~4)이면 null을 반환한다.
export function buildNudgeMessage(level, task) {
  const builder = NUDGE_MESSAGE_BUILDERS[level];
  if (!builder) return null;
  return builder({
    reason: task.reason,
    type: task.type,
    title: task.title,
    skipCount: task.skipCount,
    deadline: task.deadline,
  });
}
