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
// 가벼운 톤의 시작 독려 문구만 둔다. 고정 문구 하나만 두되, 배열 형태는 그대로 유지해
// skipCount 로테이션 코드를 바꾸지 않는다(길이 1이면 항상 같은 인덱스로 순환).
export const LV1_MESSAGES = ["가볍게 한 번 시작해볼까요?"];

// Lv2: plan.md 3번 시나리오("유형과 회피 이유를 기반으로 현재 상황에 맞는 첫 행동을
// 제안한다") 기준. 본문 앞부분은 유형/이유에 맞춰 제안한다는 톤만 담고, 실제 마이크로태스크는
// getMicrotask()가 만든 문구를 그대로 이어붙인다 — 두 곳에서 마이크로태스크 문구를
// 따로 만들지 않기 위함(#20 microtaskTemplates.js 재사용). 고정 문구 하나만 두되, 배열
// 형태는 유지해 기존 skipCount 로테이션 코드를 바꾸지 않는다.
// 화면(NudgeMessage.jsx)은 이 리드인만 "핵심 메시지"로, 뒤이은 microtask는
// 별도의 "추천 행동" 줄로 나눠서 보여주기 위해 이 상수를 그대로 export한다.
export const LV2_LEAD_INS = ["아직 막막하다면 행동을 더 작게 줄여볼게요."];

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

// microtaskOverride가 있으면(서버가 200 + source:"rule_based"로 이미 골라준 microTask)
// 클라이언트 테이블을 다시 계산하지 않고 그 값을 그대로 쓴다 — 서버/클라이언트 fallback
// 테이블이 나중에 어긋나도 화면·Focus·History가 항상 서버가 실제로 응답한 값을 쓰게 하기
// 위함. override가 없을 때만(요청 자체 실패 등 진짜 클라이언트 fallback 상황) 기존처럼
// LV3_SAFE_FALLBACKS에서 유형별로 고른다.
/**
 * @param {{ type: string, skipCount: number }} task
 * @param {string | null} [microtaskOverride]
 */
export function buildLv3FallbackMessage(task, microtaskOverride = null) {
  const microtask =
    microtaskOverride ?? (LV3_SAFE_FALLBACKS[task.type] ?? LV3_SAFE_FALLBACKS.기타);
  return {
    body: `이 할일, 벌써 ${task.skipCount}번이나 미뤄졌어요. 이번엔 이렇게 시작해볼까요? ${microtask}`,
    microtask,
    generationSource: "rule_based",
    memoryEvidence: null,
  };
}

// "눈앞의 유혹"은 "방해 요소에서 잠깐 벗어난 뒤 짧은 행동"이 전략인데, 이 준비 동작을
// microTask 문장에 넣으면 서버의 복수 행동 금지 검증(LV3_CHAINED_ACTION_PATTERN)에 걸린다.
// 그래서 "방해 제거" 넛지는 microTask가 아니라 안내 문구(body)로만 전달한다(Phase B).
// microtask 자체는 깨끗한 단일 행동으로 남아 Focus/History에 군더더기 없이 저장된다.
const LV3_TEMPTATION_LEAD_IN = "잠깐 방해되는 걸 멀리 두고 시작해볼까요? ";

// 회피 이유에 맞춘 안내 문구를 body 앞에 덧붙인다. 현재는 temptation만 별도 문구를
// 쓰고(막막함/하기싫음/완벽주의 전략은 microTask 자체의 형태로 이미 드러남), 그 외
// 이유나 reason이 없으면 기존 body를 그대로 둔다.
/**
 * @param {string} body
 * @param {string | null | undefined} reason
 */
function withReasonLeadIn(body, reason) {
  if (reason === "temptation") return `${LV3_TEMPTATION_LEAD_IN}${body}`;
  return body;
}

/**
 * @param {string} microtask
 * @param {unknown} memoryEvidence
 * @param {string | null} [reason]
 */
export function buildLv3MemoryNudgeMessage(microtask, memoryEvidence, reason = null) {
  return {
    body: withReasonLeadIn(
      `같은 유형의 지난 완료 기록을 참고해, 지금 할 일에 맞는 첫 행동을 제안했어요. ${microtask}`,
      reason,
    ),
    microtask,
    generationSource: "gemini",
    memoryEvidence,
  };
}

/**
 * @param {string} microtask
 * @param {string | null} [reason]
 */
export function buildLv3PersonalizedNudgeMessage(microtask, reason = null) {
  return {
    body: withReasonLeadIn(
      `지금 할 일과 회피 이유에 맞춰, 더 작고 구체적인 첫 행동을 제안했어요. ${microtask}`,
      reason,
    ),
    microtask,
    generationSource: "gemini",
    memoryEvidence: null,
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

// 모달 상단의 "몇 번째 알림"인지 문구 — 레벨별 고정 톤(Lv1/2 존댓말, Lv3/4 반말).
// 실제 skipCount 숫자를 노출하지 않고 레벨과 1:1로 고정한다(디자인 확정 문구).
export const NUDGE_TOP_STATUS_BY_LEVEL = {
  1: "첫 번째 알림이에요.",
  2: "두 번째 알림이에요.",
  3: "벌써 세 번째 알림이야.",
  4: "네 번째 알림이야. 이제 시작할 때야.",
};

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
  // Lv3 기억 근거 선택과 Gemini 변형은 서버에서만 수행한다. 이 빌더는 Gemini
  // 요청이 실패하거나 응답 품질 검사를 통과하지 못했을 때의 로컬 fallback이다.
  3: (task) => buildLv3FallbackMessage(task),
  // Lv4: 마감 임박 경고. 실제 마감 D-day 숫자를 언급하며 즉시 시작을 유도하는 가장 강한
  // 개입(plan.md 3번). 톤을 반말로 높이고 즉시 시작을 강하게 유도한다("생각은 여기까지").
  // D-day는 "핵심" 문장 안에 길게 넣지 않고 별도 필드(dday)로 분리해 화면(NudgeMessage.jsx)이
  // 작고 낮은 대비의 보조 정보로 따로 보여주게 한다 — microtask도 body에 엮지 않고
  // "추천 행동" 줄로 별도 표시한다.
  4: ({ type, reason, deadline }) => {
    const dday = formatDday(deadline);
    const microtask = getMicrotask({ type, reason });
    return {
      body: "생각은 여기까지.\n지금 바로 시작해.",
      microtask,
      dday,
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
