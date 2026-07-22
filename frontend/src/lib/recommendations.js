import { SCORE_LABELS } from "../data/questions";

export const ALGORITHM_VERSION = "rules-v3";

// 각 방법: plain(한 줄 쉬운 정의) · dailyExample(일상 적용 예시) · action(오늘 할 구체 행동).
// plain/dailyExample는 전문용어를 낮추고 "내 하루에 어떻게 쓰나"를 보여주기 위한 설명 필드다(채점엔 영향 없음).
const METHODS = [
  {
    title: "인출 연습",
    id: "retrieval",
    plain: "책을 덮고 기억에서 꺼내 보는 연습이에요.",
    dailyExample: "버스에서 방금 외운 영단어 5개를 눈 감고 떠올려보고, 안 떠오른 것만 다시 확인.",
    action: "교재를 덮고 핵심 개념 3개를 빈칸에 적은 뒤, 빠진 부분만 다시 확인합니다.",
    criteria: { memoryStrategy: 0.65, failureRecovery: 0.35 },
  },
  {
    title: "분산 학습",
    id: "spacing",
    plain: "한 번에 몰아서가 아니라 여러 날 나눠서 보는 방식이에요.",
    dailyExample: "시험 범위를 하루에 다 보지 않고 월·수·금 저녁에 30분씩 나눠 보기.",
    action: "오늘 10분, 내일 10분, 이틀 뒤 10분처럼 같은 내용을 나눠서 봅니다.",
    criteria: { planningStability: 0.6, memoryStrategy: 0.4 },
  },
  {
    title: "자기설명",
    id: "selfExplanation",
    plain: "배운 걸 내 말로 다시 설명해보는 방식이에요.",
    dailyExample: "오늘 배운 개념을 룸메이트에게 30초로 설명하거나, 혼잣말로 녹음해보기.",
    action: "개념을 읽은 뒤 친구에게 설명하듯 3문장으로 말하거나 적어봅니다.",
    criteria: { memoryStrategy: 0.45, selfUnderstanding: 0.35, inputStyle: 0.2 },
  },
  {
    title: "교차 학습",
    id: "interleaving",
    plain: "비슷한 것만 이어 풀지 않고 여러 유형을 섞어 푸는 방식이에요.",
    dailyExample: "수학 문제를 한 유형만 20개 풀지 말고, 세 유형을 번갈아 풀며 차이를 비교.",
    // [A9] Brunmair·Richter 2019: 개념·유형 변별엔 유리(회화 g=0.67)하나 단어 암기엔 집중학습이 나음(g=-0.39).
    action:
      "비슷한 문제만 이어 풀지 않고, 유형 2~3개를 섞어 차이를 비교합니다. 헷갈리는 개념·유형 변별에 좋고, 단어 암기는 오히려 몰아서 외우는 편이 나을 수 있습니다.",
    criteria: { stimulationNeed: 0.55, inputStyle: 0.45 },
  },
  {
    title: "오답 분석",
    id: "errorAnalysis",
    plain: "틀린 이유를 먼저 찾고 다음 행동을 정하는 방식이에요.",
    dailyExample: "채점 후 틀린 문제 옆에 '왜 틀렸는지' 한 줄 메모하고, 다시 볼 1개만 표시.",
    action: "틀린 문제를 다시 풀기 전에 왜 틀렸는지 한 줄로 적고, 다음 행동 1개를 정합니다.",
    criteria: { failureRecovery: 0.45, selfUnderstanding: 0.35, emotionImpact: 0.2 },
  },
  {
    title: "환경 설계",
    id: "environment",
    plain: "산만함을 줄이도록 책상·시작 신호를 미리 정리하는 방식이에요.",
    dailyExample: "공부 시작 전 폰은 다른 방에 두고, 책상엔 지금 볼 교재 1권만 올려두기.",
    action: "책상 위에는 지금 볼 자료 1개만 남기고, 첫 5분에 할 행동을 화면에 적어둡니다.",
    criteria: { focusEnergy: 0.4, planningStability: 0.35, burnoutCaution: 0.25 },
  },
  {
    title: "짧은 집중 블록",
    id: "shortBlock",
    plain: "짧게 끊어 부담 없이 시작하는 방식이에요.",
    dailyExample: "'딱 20분만' 타이머를 맞추고 한 블록만 끝낸 뒤 3분 쉬기.",
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
  const directSignal = affinity > 0 ? "과 직접 고른 공부습관" : "";

  return {
    basedOn,
    reason:
      `당신의 응답에서 ${labels} 신호${directSignal}가 두드러져 먼저 시도해볼 후보로 골랐습니다. ` +
      "'맞는 방법'이라 단정하는 게 아니라 '오늘 먼저 해보기 좋은 방법'이라는 뜻이며, 실제 효과는 과업과 실행 후 결과로 다시 확인해야 합니다.",
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
      plain: method.plain,
      dailyExample: method.dailyExample,
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
      plain: item.plain,
      dailyExample: item.dailyExample,
      action: item.action,
      reason: item.reason,
      basedOn: item.basedOn,
    }));

  return {
    algorithmVersion: ALGORITHM_VERSION,
    summary:
      "당신의 학습 선호와 피로 신호를 함께 정리해 보니, 큰 계획을 한 번에 세우기보다 작은 루틴으로 시작해 실제로 맞는지 스스로 확인해가는 방식이 더 편할 수 있습니다. 아래에서 오늘 먼저 시도할 방법과 그 근거를 볼 수 있습니다.",
    recommendations,
    avoidList: buildAvoidList(scores),
    stressSignals: buildStressSignals(scores),
    routine: buildRoutine(scores, recommendations),
  };
}
