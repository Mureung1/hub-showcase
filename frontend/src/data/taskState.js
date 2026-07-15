// 과제(task) × 상태(state) 입력 — 에이전트 a/b 공통 입력.
// [A9] Brunmair·Richter 2019: 암기(단어류)는 교차보다 집중학습이 유리(g=-0.39), 개념 변별은 교차가 유리(g=0.67).
// [F1] Dunlosky 2013: 분산·인출이 최고 효용 — 마감이 촉박하지 않으면 분산을 우선한다.
// 이 조정이 들어가면 baseline이 이름 그대로 "task/state" baseline이 된다(docs/context.md 정의와 일치).

export const TASK_TYPE_OPTIONS = [
  { id: "memorize", label: "암기(단어·용어·공식)" },
  { id: "understand", label: "이해(개념·원리)" },
  { id: "practice", label: "문제풀이" },
];

export const DEADLINE_OPTIONS = [
  { id: "today", label: "오늘까지" },
  { id: "thisWeek", label: "이번 주" },
  { id: "flexible", label: "여유 있음" },
];

export const TIME_OPTIONS = [
  { id: "20", label: "20분", minutes: 20 },
  { id: "40", label: "40분", minutes: 40 },
  { id: "60", label: "60분 이상", minutes: 60 },
];

const MAX_ADJUSTMENT = 15; // mbtiMethodMatching과 동일 상한 — 개인 응답을 압도하지 않는다.

function addInto(target, patch = {}) {
  Object.entries(patch).forEach(([methodId, value]) => {
    target[methodId] = (target[methodId] ?? 0) + value;
  });
}

const TASK_TYPE_ADJUSTMENT = {
  // [A9] 단어·용어 암기는 교차보다 집중학습(분산·인출)이 유리.
  memorize: { patch: { spacing: 8, retrieval: 8, interleaving: -8 }, reason: "암기 과제는 교차보다 분산·인출이 유리할 수 있습니다." },
  // [A9] 개념·원리 변별은 교차학습이 유리.
  understand: { patch: { selfExplanation: 6, interleaving: 6 }, reason: "개념 이해 과제는 자기설명·교차로 원리를 비교하면 도움이 될 수 있습니다." },
  practice: { patch: { errorAnalysis: 8, interleaving: 4 }, reason: "문제풀이 과제는 오답분석과 유형을 섞는 교차가 도움이 될 수 있습니다." },
};

const DEADLINE_ADJUSTMENT = {
  today: { patch: { shortBlock: 8, retrieval: 4 }, reason: "마감이 오늘이라 짧은 집중 블록과 인출 위주로 좁혔습니다." },
  thisWeek: { patch: { spacing: 6 }, reason: "이번 주 안이라 분산 학습을 섞을 여유가 있습니다." },
  flexible: { patch: { spacing: 8, interleaving: 4 }, reason: "여유가 있어 분산·교차 같은 지연 이점이 큰 방식을 우선했습니다." },
};

// 공식 MBTI 매칭(mbtiMethodMatching.matchMethods)과 같은 모양의 결과를 돌려준다.
export function computeTaskStateAdjustments({ taskType, deadline }) {
  const adjustments = {};
  const reasons = [];

  if (taskType && TASK_TYPE_ADJUSTMENT[taskType]) {
    addInto(adjustments, TASK_TYPE_ADJUSTMENT[taskType].patch);
    reasons.push(TASK_TYPE_ADJUSTMENT[taskType].reason);
  }
  if (deadline && DEADLINE_ADJUSTMENT[deadline]) {
    addInto(adjustments, DEADLINE_ADJUSTMENT[deadline].patch);
    reasons.push(DEADLINE_ADJUSTMENT[deadline].reason);
  }

  Object.keys(adjustments).forEach((methodId) => {
    adjustments[methodId] = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, adjustments[methodId]));
  });

  return { adjustments, reason: reasons.join(" "), sources: ["A9", "F1"] };
}
