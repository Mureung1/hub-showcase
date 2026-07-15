export const NAGGING_TONES = {
  gentle: "부드럽게",
  playful: "장난스럽게",
  direct: "직설적으로",
};

export const DEFAULT_NAGGING_TONE = "gentle";

export const mockInstantNaggingMessages = {
  gentle: [
    "먹는 건 막지 않을게요. 냉장고의 {suggestions}, 같이 넣어보는 건 어때요?",
    "간단히 먹고 싶은 날이군요. {suggestions}만 곁들여 조금 더 든든하게 먹어볼까요?",
  ],
  playful: [
    "또 라면이에요? 냉장고의 {suggestions}, 살짝 서운해하겠는데요.",
    "면만 먹고 끝내기엔 {suggestions}, 너무 멀쩡하게 남아 있어요.",
  ],
  direct: [
    "라면만 먹기보다 {suggestions}도 함께 추가해 주세요.",
    "현재 선택은 영양 구성이 단순합니다. {suggestions}로 보완해 주세요.",
  ],
};

export const mockNaggingRules = [
  {
    id: "instant-selected",
    trigger: "ingredientSelected",
    priority: 100,
    conditions: { isInstant: true },
    tone: DEFAULT_NAGGING_TONE,
    messageType: "instantImprovement",
  },
];

export const instantSuggestionPriority = [
  "ingredient-egg",
  "ingredient-green-onion",
  "ingredient-chives",
  "ingredient-onion",
  "ingredient-frozen-dumplings",
  "ingredient-sliced-cheese",
];
