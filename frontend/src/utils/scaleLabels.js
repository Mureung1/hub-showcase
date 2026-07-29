// 1~7 척도에서 "모르겠다"를 뜻하는 값.
// 점수 계산에서는 이 항목을 아예 빼고 나머지로만 계산한다. (priorityCalculator.js 참고)
export const UNKNOWN = 0;

// 1~7 척도의 한가운데(=보통). 2단계에서 꼭 답하게 되어 있는 항목의 시작점으로 쓴다.
export const SCALE_MIDDLE = 4;

// 각 1~7 단계가 무슨 뜻인지 알려주는 라벨. "4"가 사람마다 다른 문제를 줄인다.
// 입력 단계와 결과 화면의 추가 입력이 같은 라벨을 써야 해서 여기로 모아뒀다.
export const UNDERSTANDING_LEVELS = [
  "전혀 모름", "조금 앎", "약간 앎", "절반 정도", "꽤 앎", "잘 앎", "완벽",
];
export const DIFFICULTY_LEVELS = [
  "매우 쉬움", "쉬움", "약간 쉬움", "보통", "약간 어려움", "어려움", "매우 어려움",
];
export const GRADING_LEVELS = [
  "매우 후하게", "후하게", "약간 후하게", "보통", "약간 짠 편", "짠 편", "매우 짜게",
];
export const STUDY_AMOUNT_LEVELS = [
  "아주 적음", "적음", "약간 적음", "보통", "약간 많음", "많음", "아주 많음",
];
export const AVAILABLE_TIME_LEVELS = [
  "매우 부족", "부족", "약간 부족", "보통", "약간 넉넉", "넉넉", "충분",
];

// 목록에서 1~7 값을 보여줄 때, 0("모르겠다")은 "?"로 표시한다.
export function formatScale(value) {
  return value >= 1 && value <= 7 ? value : "?";
}
