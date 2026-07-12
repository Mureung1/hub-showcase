export const MBTI_TYPES = [
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ",
];

export const SCORE_KEYS = [
  "focusEnergy",
  "inputStyle",
  "memoryStrategy",
  "planningStability",
  "flexibilityNeed",
  "emotionImpact",
  "failureRecovery",
  "stimulationNeed",
  "burnoutCaution",
  "selfUnderstanding",
];

export const SCORE_LABELS = {
  focusEnergy: "몰입 에너지",
  inputStyle: "정보 입력 방식",
  memoryStrategy: "기억 전략",
  planningStability: "계획 안정감",
  flexibilityNeed: "유연성 필요도",
  emotionImpact: "감정 영향도",
  failureRecovery: "실패 회복력",
  stimulationNeed: "자극 필요도",
  burnoutCaution: "번아웃 주의도",
  selfUnderstanding: "자기이해 점수",
};

export const PREFERENCE_AXIS_LABELS = {
  IE: { left: "혼자 정리", right: "상호작용하며 정리", analogy: "I–E 유사 탐색 축" },
  SN: { left: "구체 사례", right: "개념·가능성", analogy: "S–N 유사 탐색 축" },
  TF: { left: "일관된 기준", right: "영향·가치 고려", analogy: "T–F 유사 탐색 축" },
  JP: { left: "구조·마감", right: "선택·조정", analogy: "J–P 유사 탐색 축" },
};

export const STUDY_QUESTIONS = [
  {
    id: "focus",
    title: "집중 방식",
    prompt: "공부를 시작할 때 어떤 환경이 더 편할 수 있나요?",
    options: [
      {
        id: "quiet",
        label: "조용히 혼자 몰입",
        scores: { focusEnergy: 18, planningStability: 8, stimulationNeed: -6 },
        preferenceSignals: { IE: -2 },
        methodHints: { environment: 8, retrieval: 3 },
      },
      {
        id: "shared",
        label: "함께 있거나 말하며 시작",
        scores: { focusEnergy: 8, stimulationNeed: 12, selfUnderstanding: 6 },
        preferenceSignals: { IE: 2 },
        methodHints: { selfExplanation: 8, interleaving: 3 },
      },
      {
        id: "short",
        label: "짧게 시작해야 부담이 적음",
        scores: { flexibilityNeed: 14, burnoutCaution: 10, focusEnergy: 6 },
        methodHints: { shortBlock: 10 },
      },
    ],
  },
  {
    id: "understand",
    title: "이해 방식",
    prompt: "새 개념을 익힐 때 어떤 방식이 더 잘 맞을 가능성이 있나요?",
    options: [
      {
        id: "concept",
        label: "원리와 구조를 먼저 보기",
        scores: { inputStyle: 16, memoryStrategy: 8, selfUnderstanding: 8 },
        preferenceSignals: { SN: 2 },
        methodHints: { selfExplanation: 5, retrieval: 3 },
      },
      {
        id: "example",
        label: "예시와 문제로 감 잡기",
        scores: { inputStyle: 8, memoryStrategy: 14, stimulationNeed: 6 },
        preferenceSignals: { SN: -2 },
        methodHints: { interleaving: 7, errorAnalysis: 3 },
      },
      {
        id: "explain",
        label: "내 말로 설명하며 정리",
        scores: { memoryStrategy: 18, selfUnderstanding: 12, failureRecovery: 4 },
        methodHints: { selfExplanation: 10 },
      },
    ],
  },
  {
    id: "decision",
    title: "학습 결정 기준",
    prompt: "공부 순서나 방법을 고를 때 어떤 판단이 더 자연스러운가요?",
    options: [
      {
        id: "criteria",
        label: "효율·우선순위 기준을 먼저 비교",
        scores: { planningStability: 10, selfUnderstanding: 6, failureRecovery: 4 },
        preferenceSignals: { TF: -2 },
        methodHints: { spacing: 5, errorAnalysis: 4 },
      },
      {
        id: "impact",
        label: "내 부담과 주변 영향을 함께 고려",
        scores: { emotionImpact: 10, selfUnderstanding: 8, burnoutCaution: 4 },
        preferenceSignals: { TF: 2 },
        methodHints: { shortBlock: 5, environment: 4 },
      },
      {
        id: "mixed",
        label: "상황에 따라 두 기준을 함께 사용",
        scores: { flexibilityNeed: 8, selfUnderstanding: 10, planningStability: 4 },
        methodHints: { interleaving: 4, selfExplanation: 4 },
      },
    ],
  },
  {
    id: "review",
    title: "복습 방식",
    prompt: "복습할 때 먼저 시도해볼 수 있는 방식은 무엇인가요?",
    options: [
      {
        id: "recall",
        label: "보지 않고 떠올려보기",
        scores: { memoryStrategy: 18, failureRecovery: 8, focusEnergy: 6 },
        methodHints: { retrieval: 12 },
      },
      {
        id: "spaced",
        label: "날짜를 나눠 조금씩 반복",
        scores: { planningStability: 16, memoryStrategy: 10, burnoutCaution: -6 },
        methodHints: { spacing: 12 },
      },
      {
        id: "mistake",
        label: "틀린 것부터 다시 보기",
        scores: { failureRecovery: 16, selfUnderstanding: 10, emotionImpact: -4 },
        methodHints: { errorAnalysis: 12 },
      },
    ],
  },
  {
    id: "planning",
    title: "계획 방식",
    prompt: "계획이 무너지지 않게 하려면 어떤 구조가 더 편할 수 있나요?",
    options: [
      {
        id: "fixed",
        label: "시간표처럼 정해진 순서",
        scores: { planningStability: 18, flexibilityNeed: -6, selfUnderstanding: 6 },
        preferenceSignals: { JP: -2 },
        methodHints: { spacing: 8, environment: 4 },
      },
      {
        id: "choice",
        label: "오늘 고르는 선택형 미션",
        scores: { flexibilityNeed: 18, stimulationNeed: 8, burnoutCaution: -4 },
        preferenceSignals: { JP: 2 },
        methodHints: { interleaving: 7, shortBlock: 5 },
      },
      {
        id: "minimum",
        label: "최소 단위만 정하고 시작",
        scores: { flexibilityNeed: 12, burnoutCaution: 8, failureRecovery: 8 },
        preferenceSignals: { JP: 1 },
        methodHints: { shortBlock: 10 },
      },
    ],
  },
];

export const STRESS_QUESTIONS = [
  {
    id: "fatigue",
    title: "피로 신호",
    prompt: "공부 피로가 올라올 때 가장 먼저 나타나는 신호는 무엇인가요?",
    options: [
      {
        id: "slow",
        label: "읽는 속도가 느려짐",
        scores: { burnoutCaution: 14, focusEnergy: -4, selfUnderstanding: 8 },
        methodHints: { shortBlock: 6, environment: 4 },
      },
      {
        id: "scatter",
        label: "이것저것 손대게 됨",
        scores: { stimulationNeed: 12, flexibilityNeed: 8, burnoutCaution: 8 },
        methodHints: { environment: 6, interleaving: 4 },
      },
      {
        id: "avoid",
        label: "시작을 미루게 됨",
        scores: { emotionImpact: 12, burnoutCaution: 12, failureRecovery: -4 },
        methodHints: { shortBlock: 8, environment: 4 },
      },
    ],
  },
  {
    id: "selfTalk",
    title: "자책 반응",
    prompt: "계획보다 못 했을 때 어떤 반응이 생기기 쉬운가요?",
    options: [
      {
        id: "blame",
        label: "나를 몰아붙이게 됨",
        scores: { emotionImpact: 16, burnoutCaution: 12, failureRecovery: -6 },
        methodHints: { shortBlock: 7, errorAnalysis: 4 },
      },
      {
        id: "reset",
        label: "다시 작게 시작하면 풀림",
        scores: { failureRecovery: 16, selfUnderstanding: 8, burnoutCaution: -4 },
        methodHints: { shortBlock: 7, retrieval: 3 },
      },
      {
        id: "freeze",
        label: "무엇부터 할지 멈춤",
        scores: { planningStability: -4, flexibilityNeed: 10, emotionImpact: 10 },
        methodHints: { environment: 7, shortBlock: 5 },
      },
    ],
  },
  {
    id: "recovery",
    title: "회복 방식",
    prompt: "짧게 회복할 때 더 편할 수 있는 방식은 무엇인가요?",
    options: [
      {
        id: "body",
        label: "걷기나 스트레칭",
        scores: { burnoutCaution: -8, emotionImpact: -4, focusEnergy: 8 },
        methodHints: { shortBlock: 3 },
      },
      {
        id: "organize",
        label: "책상과 다음 할 일 정리",
        scores: { planningStability: 12, selfUnderstanding: 8, emotionImpact: -4 },
        methodHints: { environment: 9 },
      },
      {
        id: "talk",
        label: "상황을 말로 정리",
        scores: { selfUnderstanding: 14, emotionImpact: -6, memoryStrategy: 4 },
        methodHints: { selfExplanation: 7 },
      },
    ],
  },
  {
    id: "collapse",
    title: "계획 붕괴 반응",
    prompt: "예상보다 진도가 밀렸을 때 어떤 다음 행동이 더 가능해 보이나요?",
    options: [
      {
        id: "oneTask",
        label: "가장 작은 1개만 다시 시작",
        scores: { failureRecovery: 16, burnoutCaution: -6, flexibilityNeed: 8 },
        methodHints: { shortBlock: 9 },
      },
      {
        id: "replan",
        label: "남은 시간을 다시 배치",
        scores: { planningStability: 16, selfUnderstanding: 8, emotionImpact: -2 },
        methodHints: { spacing: 8, environment: 3 },
      },
      {
        id: "change",
        label: "과목이나 방식 바꾸기",
        scores: { stimulationNeed: 14, flexibilityNeed: 12, focusEnergy: 4 },
        methodHints: { interleaving: 9 },
      },
    ],
  },
];
