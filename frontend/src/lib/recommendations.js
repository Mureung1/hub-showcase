import { SCORE_LABELS } from "../data/questions";

export const ALGORITHM_VERSION = "rules-v3";

const METHODS = [
  {
    title: "인출 연습",
    id: "retrieval",
    action: "교재를 덮고 핵심 개념 3개를 빈칸에 적은 뒤, 빠진 부분만 다시 확인합니다.",
    criteria: { memoryStrategy: 0.65, failureRecovery: 0.35 },
  },
  {
    title: "분산 학습",
    id: "spacing",
    action: "오늘 10분, 내일 10분, 이틀 뒤 10분처럼 같은 내용을 나눠서 봅니다.",
    criteria: { planningStability: 0.6, memoryStrategy: 0.4 },
  },
  {
    title: "자기설명",
    id: "selfExplanation",
    action: "개념을 읽은 뒤 친구에게 설명하듯 3문장으로 말하거나 적어봅니다.",
    criteria: { memoryStrategy: 0.45, selfUnderstanding: 0.35, inputStyle: 0.2 },
  },
  {
    title: "교차 학습",
    id: "interleaving",
    action: "비슷한 문제만 이어 풀지 않고, 유형 2~3개를 섞어 차이를 비교합니다.",
    criteria: { stimulationNeed: 0.55, inputStyle: 0.45 },
  },
  {
    title: "오답 분석",
    id: "errorAnalysis",
    action: "틀린 문제를 다시 풀기 전에 왜 틀렸는지 한 줄로 적고, 다음 행동 1개를 정합니다.",
    criteria: { failureRecovery: 0.45, selfUnderstanding: 0.35, emotionImpact: 0.2 },
  },
  {
    title: "환경 설계",
    id: "environment",
    action: "책상 위에는 지금 볼 자료 1개만 남기고, 첫 5분에 할 행동을 화면에 적어둡니다.",
    criteria: { focusEnergy: 0.4, planningStability: 0.35, burnoutCaution: 0.25 },
  },
  {
    title: "짧은 집중 블록",
    id: "shortBlock",
    action: "20분 공부, 3분 회복, 5분 확인으로 끝나는 작은 블록 하나만 완료합니다.",
    criteria: { flexibilityNeed: 0.4, burnoutCaution: 0.35, emotionImpact: 0.25 },
  },
];

function scoreMethod(method, scores, affinity, matchBonus = 0) {
  const criterionScore = Object.entries(method.criteria).reduce(
    (total, [key, weight]) => total + (scores[key] ?? 50) * weight,
    0,
  );

  return criterionScore + Math.min(15, affinity * 0.75) + matchBonus;
}

function buildMethodEvidence(method, scores, affinity) {
  const basedOn = Object.entries(method.criteria)
    .sort(([keyA, weightA], [keyB, weightB]) =>
      (scores[keyB] ?? 50) * weightB - (scores[keyA] ?? 50) * weightA,
    )
    .slice(0, 2)
    .map(([key]) => key);
  const labels = basedOn.map((key) => SCORE_LABELS[key]).join("·");
  const directSignal = affinity > 0 ? "과 선택한 공부습관" : "";

  return {
    basedOn,
    reason: `현재 응답의 ${labels} 신호${directSignal}를 함께 반영한 후보입니다. 실제 효과는 과업과 실행 후 결과로 다시 확인해야 합니다.`,
  };
}

function buildAvoidList(scores) {
  const avoid = [];

  if (scores.burnoutCaution >= 65) {
    avoid.push("처음부터 긴 시간표를 세우기보다 20~30분 단위로 작게 시작하세요.");
  }
  if (scores.emotionImpact >= 65) {
    avoid.push("계획이 밀렸을 때 자책으로 해석하기보다 다음 행동 1개로 줄여보세요.");
  }
  if (scores.flexibilityNeed >= 65) {
    avoid.push("매일 같은 순서만 고집하기보다 선택형 미션을 섞는 편이 더 편할 수 있습니다.");
  }
  if (scores.stimulationNeed >= 65) {
    avoid.push("한 유형의 문제만 오래 반복하기보다 방식이나 과목을 짧게 바꿔보세요.");
  }

  return avoid.slice(0, 3);
}

function buildStressSignals(scores) {
  const signals = [];

  if (scores.burnoutCaution >= 65) {
    signals.push("읽는 속도가 느려지거나 시작을 미루는 피로 신호가 나타날 수 있습니다.");
  }
  if (scores.emotionImpact >= 65) {
    signals.push("계획이 밀릴 때 감정 부담이 커질 가능성이 있습니다.");
  }
  if (scores.failureRecovery <= 45) {
    signals.push("틀린 뒤 바로 다시 시작하기보다 아주 작은 행동으로 재시작하는 편이 좋을 수 있습니다.");
  }
  if (signals.length === 0) {
    signals.push("현재 응답에서는 큰 피로 신호보다 루틴 유지 신호가 더 두드러집니다.");
  }

  return signals;
}

function buildRoutine(scores, recommendations) {
  const first = recommendations[0]?.title ?? "짧은 집중 블록";
  const recoveryMinutes = 3;
  const recovery =
    scores.emotionImpact >= 65
      ? `${recoveryMinutes}분 동안 지금 감정을 한 단어로 적고, 다음 행동 1개만 다시 고릅니다.`
      : scores.burnoutCaution >= 65
        ? `${recoveryMinutes}분 동안 자리에서 일어나 어깨와 목을 풀고 물을 마십니다.`
        : `${recoveryMinutes}분 동안 책상 위를 정리하고 다음 공부 재료 1개만 남깁니다.`;

  // 피로 신호가 높으면 핵심 블록을 짧게 잡는다. 총 예상시간은 아래 단계 합계로만 산출한다.
  const coreMinutes = scores.burnoutCaution >= 70 ? 10 : 15;
  const studySteps = [
    { minutes: 5, text: "오늘 볼 범위와 목표 1개를 적습니다." },
    { minutes: coreMinutes, text: `${first} 방식으로 핵심 내용을 처리합니다.` },
    { minutes: 5, text: "기억나는 내용과 막힌 부분을 나눠 적습니다." },
  ];
  const studyMinutes = studySteps.reduce((sum, step) => sum + step.minutes, 0);

  return {
    title: `오늘은 ${first} 중심으로 시작`,
    estimatedMinutes: studyMinutes + recoveryMinutes,
    studySteps: studySteps.map((step) => `${step.minutes}분: ${step.text}`),
    recoveryStep: recovery,
    recoveryMinutes,
  };
}

export function createRecommendations(scores, methodAffinities = {}, matchAdjustments = {}) {
  const recommendations = METHODS.map((method, order) => {
    const affinity = methodAffinities[method.id] ?? 0;
    const matchBonus = matchAdjustments[method.id] ?? 0;
    const evidence = buildMethodEvidence(method, scores, affinity);

    return {
      id: method.id,
      title: method.title,
      action: method.action,
      reason: evidence.reason,
      basedOn: evidence.basedOn,
      order,
      weight: scoreMethod(method, scores, affinity, matchBonus),
    };
  })
    // 동점일 때는 METHODS 정의 순서로 고정해 sort 안정성에 의존하지 않는다.
    .sort((a, b) => b.weight - a.weight || a.order - b.order)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      action: item.action,
      reason: item.reason,
      basedOn: item.basedOn,
    }));

  return {
    algorithmVersion: ALGORITHM_VERSION,
    summary:
      "응답을 보면 학습 선호와 피로 신호를 함께 보며 루틴을 작게 설계하는 방식이 더 편할 수 있습니다.",
    recommendations,
    avoidList: buildAvoidList(scores),
    stressSignals: buildStressSignals(scores),
    routine: buildRoutine(scores, recommendations),
  };
}
