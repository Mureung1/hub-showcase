export const ALGORITHM_VERSION = "rules-v1";

const METHODS = [
  {
    title: "인출 연습",
    action: "교재를 덮고 핵심 개념 3개를 빈칸에 적은 뒤, 빠진 부분만 다시 확인합니다.",
    score: ({ memoryStrategy, failureRecovery }) => memoryStrategy * 1.2 + failureRecovery * 0.5,
    reason: "기억 전략과 다시 시작하는 힘이 추천 신호로 잡혀, 먼저 떠올려보는 방식이 더 편할 수 있습니다.",
  },
  {
    title: "분산 학습",
    action: "오늘 10분, 내일 10분, 이틀 뒤 10분처럼 같은 내용을 나눠서 봅니다.",
    score: ({ planningStability, burnoutCaution }) => planningStability * 1.1 + (100 - burnoutCaution) * 0.4,
    reason: "계획 안정감이 높거나 피로 누적을 줄일 필요가 있어, 짧게 나눠 반복하는 방식이 맞을 가능성이 있습니다.",
  },
  {
    title: "자기설명",
    action: "개념을 읽은 뒤 친구에게 설명하듯 3문장으로 말하거나 적어봅니다.",
    score: ({ memoryStrategy, selfUnderstanding, inputStyle }) =>
      memoryStrategy + selfUnderstanding * 0.8 + inputStyle * 0.4,
    reason: "내 말로 정리하는 응답과 자기이해 신호가 있어, 설명하며 정리하는 방법을 먼저 시도해볼 수 있습니다.",
  },
  {
    title: "교차 학습",
    action: "비슷한 문제만 이어 풀지 않고, 유형 2~3개를 섞어 차이를 비교합니다.",
    score: ({ stimulationNeed, inputStyle }) => stimulationNeed * 1.1 + inputStyle * 0.5,
    reason: "변화와 예시 기반 이해가 도움이 될 수 있어, 유형을 섞어 비교하는 방식이 더 편할 수 있습니다.",
  },
  {
    title: "오답 분석",
    action: "틀린 문제를 다시 풀기 전에 왜 틀렸는지 한 줄로 적고, 다음 행동 1개를 정합니다.",
    score: ({ failureRecovery, selfUnderstanding, emotionImpact }) =>
      failureRecovery + selfUnderstanding * 0.8 + emotionImpact * 0.3,
    reason: "실패 뒤 다시 시작하는 힘과 감정 영향 신호가 있어, 오답을 작게 재해석하는 방식이 도움이 될 가능성이 있습니다.",
  },
  {
    title: "환경 설계",
    action: "책상 위에는 지금 볼 자료 1개만 남기고, 첫 5분에 할 행동을 화면에 적어둡니다.",
    score: ({ focusEnergy, planningStability, burnoutCaution }) =>
      focusEnergy * 0.8 + planningStability * 0.7 + burnoutCaution * 0.4,
    reason: "집중 환경과 피로 신호가 함께 보여, 시작 장벽을 낮추는 환경 정리가 먼저 필요할 수 있습니다.",
  },
  {
    title: "짧은 집중 블록",
    action: "20분 공부, 3분 회복, 5분 확인으로 끝나는 작은 블록 하나만 완료합니다.",
    score: ({ flexibilityNeed, burnoutCaution, emotionImpact }) =>
      flexibilityNeed + burnoutCaution * 0.9 + emotionImpact * 0.5,
    reason: "유연성 필요도와 피로 신호가 있어, 긴 계획보다 짧은 블록이 더 편할 수 있습니다.",
  },
];

function pickTopScores(scores) {
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([key]) => key);
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
  const recovery =
    scores.emotionImpact >= 65
      ? "3분 동안 지금 감정을 한 단어로 적고, 다음 행동 1개만 다시 고릅니다."
      : scores.burnoutCaution >= 65
        ? "3분 동안 자리에서 일어나 어깨와 목을 풀고 물을 마십니다."
        : "3분 동안 책상 위를 정리하고 다음 공부 재료 1개만 남깁니다.";

  return {
    title: `오늘은 ${first} 중심으로 시작`,
    estimatedMinutes: scores.burnoutCaution >= 70 ? 20 : 30,
    studySteps: [
      "5분: 오늘 볼 범위와 목표 1개를 적습니다.",
      `15분: ${first} 방식으로 핵심 내용을 처리합니다.`,
      "5분: 기억나는 내용과 막힌 부분을 나눠 적습니다.",
    ],
    recoveryStep: recovery,
  };
}

export function createRecommendations(scores) {
  const basedOn = pickTopScores(scores);
  const recommendations = METHODS.map((method) => ({
    title: method.title,
    action: method.action,
    reason: method.reason,
    basedOn,
    weight: method.score(scores),
  }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((item) => ({
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
