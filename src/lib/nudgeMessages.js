// 레벨별 넛지 본문 생성기. content-as-data: 문구 목록은 배열로, 레벨→빌더 매핑은
// 객체로 분리해두고 컴포넌트(NudgeMessage.jsx)는 매핑 결과만 렌더링한다.
//
// 빌더 함수 시그니처는 wireframe.md 4번(잔소리봇 개입 모달)이 명시한
// { reason, type, title, skipCount, deadline }로 레벨과 무관하게 고정해둔다 —
// Lv2~4가 reason/type/deadline을 쓰게 되어도 NudgeModal/NudgeMessage는 건드릴 필요 없이
// 이 파일에 항목만 추가하면 되게 하기 위함.
import { differenceInCalendarDays } from "date-fns";
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

// Lv2 본문 조립을 순수 함수로 분리한다. microtask를 생략하면 기존 룰베이스를 그대로
// 사용하고, Gemini 결과를 넘기면 동일한 문장 구조 안에 그 결과만 넣는다.
/**
 * @param {{ title?: string, type: string, reason: string, skipCount: number }} task
 * @param {string | null} microtask
 * @param {"gemini" | "rule_based"} generationSource
 */
export function buildLv2NudgeMessage(
  task,
  microtask = null,
  generationSource = "rule_based",
) {
  const finalMicrotask =
    microtask ?? getMicrotask({ type: task.type, reason: task.reason });
  return {
    body: `${LV2_LEAD_INS[task.skipCount % LV2_LEAD_INS.length]} ${finalMicrotask}`,
    microtask: finalMicrotask,
    generationSource,
    memoryEvidence: null,
  };
}

// Lv3의 최종 안전망. 기존 랜덤 템플릿에는 열기/읽기/확인하기로 끝나는 약한
// 행동도 있으므로, Gemini 실패나 과거 근거 부재 시에는 결과물이 남는 유형별
// 행동 하나를 사용한다. Lv2/Lv4 템플릿에는 영향을 주지 않는다.
export const LV3_SAFE_FALLBACKS = {
  "리포트/글쓰기": "문서에 핵심 주장 한 문장 쓰기",
  "문제풀이/암기": "가장 쉬운 문제 한 개의 풀이 첫 줄 쓰기",
  "발표/PT 준비": "첫 슬라이드에 발표 핵심 한 문장 입력하기",
  "코딩 실습": "작업 파일에 해결할 TODO 한 줄 작성하기",
  시험공부: "첫 소제목 내용을 한 문장으로 요약하기",
  프로젝트: "다음 작업 하나를 체크리스트에 작성하기",
  조별과제: "공유 문서의 내 담당 부분에 첫 문장 쓰기",
  개인공부: "첫 소제목의 핵심을 한 문장으로 적기",
  기타: "5분 안에 남길 결과 한 줄 작성하기",
};

export function buildLv3FallbackMessage(task) {
  const microtask =
    LV3_SAFE_FALLBACKS[task.type] ?? LV3_SAFE_FALLBACKS.기타;
  return {
    body: `이 할일, 벌써 ${task.skipCount}번이나 미뤄졌어요. 이번엔 이렇게 시작해볼까요? ${microtask}`,
    microtask,
    generationSource: "rule_based",
    memoryEvidence: null,
  };
}

export function buildLv3MemoryNudgeMessage(microtask, memoryEvidence) {
  return {
    body: `같은 유형의 지난 완료 기록을 참고해, 지금 할 일에 맞는 첫 행동을 제안했어요. ${microtask}`,
    microtask,
    generationSource: "gemini",
    memoryEvidence,
  };
}

// task.deadline(UTC ISO)과 현재 시각으로 D-day 라벨을 만든다. RegisterPage가
// addDays(new Date(), N)로 "오늘+N일"을 저장하므로, 그 역방향으로 달력일 차이를
// 계산한다(시:분이 아니라 달력일 기준이라 하루 중 언제 계산해도 안정적).
//   미래: D-3 / 당일: D-day / 지남: D+2
export function formatDday(deadline, now = new Date()) {
  const diff = differenceInCalendarDays(new Date(deadline), now);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-day";
  return `D+${-diff}`;
}

// 레벨 4에서는 "지금 시작하기"만 남기고 다른 선택지(닫기 등)를 잠근다(plan.md 3번 Lv4:
// "즉시 시작을 유도하는 강한 개입"). NudgeModal이 이 값으로 닫기 버튼을 숨긴다.
export function isLockedToStart(level) {
  return level === 4;
}

// { [level]: (input) => { body, microtask } } — microtask는 Lv1에서 항상 null이고,
// Lv2부터 실제 마이크로태스크 문구가 채워질 자리.
export const NUDGE_MESSAGE_BUILDERS = {
  1: ({ skipCount }) => ({
    body: LV1_MESSAGES[skipCount % LV1_MESSAGES.length],
    microtask: null,
    generationSource: "none",
    memoryEvidence: null,
  }),
  2: (task) => buildLv2NudgeMessage(task),
  // Lv3 기억 근거 선택과 Gemini 변형은 서버에서만 수행한다. 이 빌더는 근거가
  // 없거나 요청이 실패했을 때의 안전한 로컬 fallback만 담당한다.
  3: (task) => buildLv3FallbackMessage(task),
  // Lv4: 마감 임박 경고. 실제 마감 D-day 숫자를 언급하며 즉시 시작을 유도하는 가장 강한
  // 개입(plan.md 3번). 톤을 높이고, "지금 시작하기"만 남긴다(isLockedToStart + NudgeModal).
  4: ({ type, reason, deadline }) => {
    const dday = formatDday(deadline);
    const microtask = getMicrotask({ type, reason });
    return {
      body: `마감이 ${dday}예요. 더 미루면 진짜 늦어요 — 지금 딱 이것만 시작해요: ${microtask}`,
      microtask,
      generationSource: "rule_based",
      memoryEvidence: null,
    };
  },
};

// task 객체에서 빌더 입력값을 뽑아 해당 레벨의 문구를 만든다.
// 아직 채워지지 않은 레벨(0·4)이면 null을 반환한다.
// completedTasks는 Lv3 기억 기반 개입이 참조하는 세션 내 완료 이력(그 외 레벨은 무시).
export function buildNudgeMessage(level, task, _completedTasks = []) {
  const builder = NUDGE_MESSAGE_BUILDERS[level];
  if (!builder) return null;
  return builder({
    id: task.id,
    reason: task.reason,
    customReasonText: task.customReasonText,
    type: task.type,
    title: task.title,
    skipCount: task.skipCount,
    deadline: task.deadline,
    completedTasks: _completedTasks,
  });
}
