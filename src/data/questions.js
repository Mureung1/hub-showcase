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
      },
      {
        id: "shared",
        label: "함께 있거나 말하며 시작",
        scores: { focusEnergy: 8, stimulationNeed: 12, selfUnderstanding: 6 },
      },
      {
        id: "short",
        label: "짧게 시작해야 부담이 적음",
        scores: { flexibilityNeed: 14, burnoutCaution: 10, focusEnergy: 6 },
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
      },
      {
        id: "example",
        label: "예시와 문제로 감 잡기",
        scores: { inputStyle: 8, memoryStrategy: 14, stimulationNeed: 6 },
      },
      {
        id: "explain",
        label: "내 말로 설명하며 정리",
        scores: { memoryStrategy: 18, selfUnderstanding: 12, failureRecovery: 4 },
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
      },
      {
        id: "spaced",
        label: "날짜를 나눠 조금씩 반복",
        scores: { planningStability: 16, memoryStrategy: 10, burnoutCaution: -6 },
      },
      {
        id: "mistake",
        label: "틀린 것부터 다시 보기",
        scores: { failureRecovery: 16, selfUnderstanding: 10, emotionImpact: -4 },
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
      },
      {
        id: "choice",
        label: "오늘 고르는 선택형 미션",
        scores: { flexibilityNeed: 18, stimulationNeed: 8, burnoutCaution: -4 },
      },
      {
        id: "minimum",
        label: "최소 단위만 정하고 시작",
        scores: { flexibilityNeed: 12, burnoutCaution: 8, failureRecovery: 8 },
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
      },
      {
        id: "scatter",
        label: "이것저것 손대게 됨",
        scores: { stimulationNeed: 12, flexibilityNeed: 8, burnoutCaution: 8 },
      },
      {
        id: "avoid",
        label: "시작을 미루게 됨",
        scores: { emotionImpact: 12, burnoutCaution: 12, failureRecovery: -4 },
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
      },
      {
        id: "reset",
        label: "다시 작게 시작하면 풀림",
        scores: { failureRecovery: 16, selfUnderstanding: 8, burnoutCaution: -4 },
      },
      {
        id: "freeze",
        label: "무엇부터 할지 멈춤",
        scores: { planningStability: -4, flexibilityNeed: 10, emotionImpact: 10 },
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
      },
      {
        id: "organize",
        label: "책상과 다음 할 일 정리",
        scores: { planningStability: 12, selfUnderstanding: 8, emotionImpact: -4 },
      },
      {
        id: "talk",
        label: "상황을 말로 정리",
        scores: { selfUnderstanding: 14, emotionImpact: -6, memoryStrategy: 4 },
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
      },
      {
        id: "replan",
        label: "남은 시간을 다시 배치",
        scores: { planningStability: 16, selfUnderstanding: 8, emotionImpact: -2 },
      },
      {
        id: "change",
        label: "과목이나 방식 바꾸기",
        scores: { stimulationNeed: 14, flexibilityNeed: 12, focusEnergy: 4 },
      },
    ],
  },
];
