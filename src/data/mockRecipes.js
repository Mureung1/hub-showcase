const commonCoachReaction = {
  title: "오늘 선택은 꽤 괜찮은데요?",
  message: "집에 있는 재료를 잘 활용해서 한 끼를 해결할 수 있어요.",
};

const specialCoachReaction = {
  title: "오늘 무슨 좋은 일 있어요?",
  message: "평소보다 조금 분위기 있는 한 끼를 만들겠네요.",
};

function recipe(values) {
  return {
    optionalIngredients: [],
    missingIngredients: [],
    isSpecial: false,
    isInstant: false,
    recommendationReasons: [],
    coachReaction: values.isSpecial ? specialCoachReaction : commonCoachReaction,
    ...values,
  };
}

export const mockRecipes = [
  recipe({
    id: "recipe-tuna-mayo-sandwich", name: "참치마요 샌드위치",
    requiredIngredients: ["사워도우", "참치 통조림", "마요네즈"], optionalIngredients: ["슬라이스 치즈", "양파", "후추"],
    cookingTime: 8, difficulty: "easy", cookingMethod: "noFire", effortLevel: "low", recommendationType: "quick",
    recommendationReasons: ["불을 사용하지 않아도 돼요.", "설거지가 적어요.", "참치 통조림을 활용할 수 있어요."],
    steps: ["참치의 기름을 빼요.", "참치와 마요네즈를 섞어요.", "사워도우 사이에 속을 올려 완성해요."],
  }),
  recipe({
    id: "recipe-ham-cheese-sandwich", name: "햄치즈 샌드위치",
    requiredIngredients: ["사워도우", "햄 통조림", "슬라이스 치즈"], optionalIngredients: ["버터", "후추"],
    cookingTime: 7, difficulty: "easy", cookingMethod: "noFire", effortLevel: "low", recommendationType: "quick",
    recommendationReasons: ["7분이면 완성할 수 있어요.", "불 없이 바로 만들 수 있어요.", "설거지가 거의 없어요."],
    steps: ["햄을 얇게 썰어요.", "빵에 햄과 치즈를 차례로 올려요.", "먹기 좋은 크기로 잘라요."],
  }),
  recipe({
    id: "recipe-microwave-egg", name: "전자레인지 계란찜",
    requiredIngredients: ["계란", "소금"], optionalIngredients: ["대파", "슬라이스 치즈", "참치액"],
    cookingTime: 7, difficulty: "easy", cookingMethod: "noFire", effortLevel: "low", recommendationType: "quick",
    recommendationReasons: ["전자레인지로 만들 수 있어요.", "7분 안에 완성할 수 있어요.", "설거지가 적어요."],
    coachReaction: { title: "오늘은 불도 쉬는 날이군요.", message: "그래도 굶지 않고 한 끼를 챙겼으니 괜찮은 선택이에요." },
    steps: ["계란을 그릇에 풀어요.", "소금과 물을 조금 넣어요.", "전자레인지에서 나누어 익혀요.", "상태를 확인하고 대파를 올려요."],
  }),
  recipe({
    id: "recipe-microwave-dumplings", name: "전자레인지 만두",
    requiredIngredients: ["냉동만두"], optionalIngredients: ["진간장", "고춧가루", "대파"],
    cookingTime: 6, difficulty: "easy", cookingMethod: "noFire", effortLevel: "low", recommendationType: "quick",
    recommendationReasons: ["전자레인지 하나면 충분해요.", "6분 안에 먹을 수 있어요.", "냉동만두를 바로 활용해요."],
    steps: ["만두를 접시에 펼쳐요.", "물을 살짝 뿌리고 덮개를 씌워요.", "전자레인지로 익힌 뒤 상태를 확인해요."],
  }),
  recipe({
    id: "recipe-cold-tofu", name: "냉두부",
    requiredIngredients: ["두부", "진간장"], optionalIngredients: ["대파", "고춧가루", "참치액"],
    cookingTime: 5, difficulty: "easy", cookingMethod: "noFire", effortLevel: "low", recommendationType: "quick",
    recommendationReasons: ["불을 전혀 사용하지 않아요.", "두부를 5분 만에 먹을 수 있어요.", "설거지가 적어요."],
    steps: ["두부의 물기를 빼요.", "먹기 좋은 크기로 썰어요.", "간장과 선택 양념을 올려요."],
  }),
  recipe({
    id: "recipe-cheese-toast", name: "치즈 토스트",
    requiredIngredients: ["사워도우", "슬라이스 치즈"], optionalIngredients: ["버터", "꿀"],
    cookingTime: 7, difficulty: "easy", cookingMethod: "noFire", effortLevel: "low", recommendationType: "quick",
    recommendationReasons: ["전자레인지나 토스터로 만들 수 있어요.", "재료가 단순해요.", "7분이면 충분해요."],
    steps: ["빵 위에 치즈를 올려요.", "치즈가 녹을 때까지 데워요.", "원하면 꿀을 조금 곁들여요."],
  }),
  recipe({
    id: "recipe-egg-ramen", name: "계란 라면",
    requiredIngredients: ["라면", "계란"], optionalIngredients: ["대파", "냉동만두"],
    cookingTime: 8, difficulty: "easy", cookingMethod: "fire", effortLevel: "low", recommendationType: "instant", isInstant: true,
    recommendationReasons: ["8분 안에 빠르게 완성돼요.", "계란으로 단백질을 보완해요.", "대파나 만두를 더할 수 있어요."],
    coachReaction: { title: "또 라면이에요?", message: "먹는 건 막지 않을게요. 계란과 대파가 있으니 같이 넣는 정도는 해봅시다." },
    steps: ["물을 끓이고 면과 수프를 넣어요.", "면이 풀리면 계란을 넣어요.", "대파가 있으면 마지막에 올려요."],
  }),
  recipe({
    id: "recipe-spicy-pork", name: "제육볶음",
    requiredIngredients: ["제육볶음"], optionalIngredients: ["양파", "대파", "부추"],
    cookingTime: 10, difficulty: "easy", cookingMethod: "fire", effortLevel: "low", recommendationType: "quick",
    recommendationReasons: ["양념된 제육을 바로 활용해요.", "10분이면 한 끼가 완성돼요.", "추가 장보기가 필요 없어요."],
    steps: ["팬을 달군 뒤 제육볶음을 올려요.", "고기가 익도록 고르게 볶아요.", "선택 채소를 넣고 한 번 더 볶아요."],
  }),
  recipe({
    id: "recipe-pork-neck", name: "목살 구이",
    requiredIngredients: ["목살", "소금", "후추"], optionalIngredients: ["쌈장", "양파"],
    cookingTime: 15, difficulty: "easy", cookingMethod: "fire", effortLevel: "medium", recommendationType: "balanced",
    recommendationReasons: ["냉동 목살을 든든하게 활용해요.", "15분이면 만들 수 있어요.", "양파를 곁들이기 좋아요."],
    steps: ["해동한 목살에 소금과 후추를 뿌려요.", "달군 팬에 앞뒤로 구워요.", "양파가 있으면 함께 구워요."],
  }),
  recipe({
    id: "recipe-braised-tofu", name: "두부조림",
    requiredIngredients: ["두부", "진간장", "고춧가루"], optionalIngredients: ["대파", "양파", "다진마늘"],
    cookingTime: 18, difficulty: "normal", cookingMethod: "fire", effortLevel: "medium", recommendationType: "balanced",
    recommendationReasons: ["두부와 채소를 고르게 활용해요.", "밥반찬으로 넉넉히 만들 수 있어요.", "18분이면 완성돼요."],
    steps: ["두부를 도톰하게 썰어 구워요.", "간장과 고춧가루로 양념장을 만들어요.", "양념을 붓고 자작하게 졸여요."],
  }),
  recipe({
    id: "recipe-spicy-noodles", name: "비빔국수",
    requiredIngredients: ["소면", "고추장", "진간장"], optionalIngredients: ["고춧가루", "꿀", "레몬즙", "양파", "부추"],
    cookingTime: 15, difficulty: "normal", cookingMethod: "fire", effortLevel: "medium", recommendationType: "quick",
    recommendationReasons: ["15분 안에 완성할 수 있어요.", "소면과 남은 채소를 활용해요.", "한 그릇으로 해결할 수 있어요."],
    steps: ["소면을 삶아 찬물에 헹궈요.", "고추장과 간장으로 양념장을 만들어요.", "면과 양념을 비비고 선택 채소를 올려요."],
  }),
  recipe({
    id: "recipe-tomato-pasta", name: "토마토 파스타",
    requiredIngredients: ["파스타면", "토마토 소스", "올리브유"], optionalIngredients: ["다진마늘", "양파", "슬라이스 치즈", "후추"],
    cookingTime: 20, difficulty: "normal", cookingMethod: "fire", effortLevel: "medium", recommendationType: "balanced",
    recommendationReasons: ["보관 중인 면과 소스를 활용해요.", "20분 안에 완성할 수 있어요.", "치즈나 양파로 풍미를 더할 수 있어요."],
    steps: ["파스타면을 삶아요.", "팬에 소스와 선택 채소를 데워요.", "면을 넣고 소스가 배도록 섞어요."],
  }),
  recipe({
    id: "recipe-tuna-tomato-pasta", name: "참치 토마토 파스타",
    requiredIngredients: ["파스타면", "토마토 소스", "참치 통조림"], optionalIngredients: ["올리브유", "다진마늘", "양파", "슬라이스 치즈"],
    cookingTime: 20, difficulty: "normal", cookingMethod: "fire", effortLevel: "medium", recommendationType: "balanced",
    recommendationReasons: ["참치로 단백질을 더해요.", "장기 보관 재료를 고르게 활용해요.", "20분이면 근사한 한 끼가 돼요."],
    steps: ["파스타면을 삶아요.", "토마토 소스와 참치를 데워요.", "면을 넣고 골고루 섞어요."],
  }),
  recipe({
    id: "recipe-dumpling-soup", name: "만두국",
    requiredIngredients: ["냉동만두", "계란", "대파"], optionalIngredients: ["다진마늘", "참치액", "다시다"],
    cookingTime: 15, difficulty: "normal", cookingMethod: "fire", effortLevel: "medium", recommendationType: "balanced",
    recommendationReasons: ["냉동만두와 계란을 함께 활용해요.", "15분이면 따뜻한 국물이 완성돼요.", "추가 장보기 없이 만들 수 있어요."],
    steps: ["물에 육수 양념을 넣고 끓여요.", "만두를 넣어 익혀요.", "계란을 풀고 대파를 올려 마무리해요."],
  }),
  recipe({
    id: "recipe-aglio-olio", name: "알리오 올리오",
    requiredIngredients: ["파스타면", "올리브유", "다진마늘", "후추", "페페론치노"], optionalIngredients: ["파슬리"],
    cookingTime: 20, difficulty: "special", cookingMethod: "fire", effortLevel: "medium", recommendationType: "special", isSpecial: true,
    recommendationReasons: ["면과 마늘로 분위기 있는 한 끼를 만들어요.", "페페론치노 하나만 더 있으면 돼요.", "20분이면 완성할 수 있어요."],
    steps: ["파스타면을 삶아요.", "올리브유에 마늘과 페페론치노 향을 내요.", "면수와 면을 넣고 충분히 섞어요."],
  }),
  recipe({
    id: "recipe-shrimp-oil-pasta", name: "새우 오일 파스타",
    requiredIngredients: ["파스타면", "올리브유", "다진마늘", "후추", "냉동 새우", "페페론치노"], optionalIngredients: ["파슬리", "레몬즙"],
    cookingTime: 25, difficulty: "special", cookingMethod: "fire", effortLevel: "medium", recommendationType: "special", isSpecial: true,
    recommendationReasons: ["새우를 더해 평소보다 특별하게 즐겨요.", "추가 구매 재료는 2개예요.", "오일 파스타의 기본 재료를 활용해요."],
    steps: ["면을 삶는 동안 새우를 해동해요.", "마늘과 새우를 올리브유에 익혀요.", "면과 면수를 넣고 소스가 배도록 섞어요."],
  }),
  recipe({
    id: "recipe-tomato-cheese-pasta", name: "토마토 치즈 파스타",
    requiredIngredients: ["파스타면", "토마토 소스", "슬라이스 치즈", "양파", "다진마늘", "올리브유"], optionalIngredients: ["바질", "방울토마토"],
    cookingTime: 20, difficulty: "special", cookingMethod: "fire", effortLevel: "medium", recommendationType: "special", isSpecial: true,
    recommendationReasons: ["치즈로 파스타를 더 근사하게 만들어요.", "냉장고 채소와 소스를 활용해요.", "올리브유 하나만 더 있으면 충분해요."],
    steps: ["파스타면을 삶아요.", "양파와 마늘을 볶고 토마토 소스를 넣어요.", "면과 치즈를 넣고 부드럽게 섞어요."],
  }),
  recipe({
    id: "recipe-ricotta-salad", name: "리코타 치즈 샐러드",
    requiredIngredients: ["양파", "올리브유", "레몬즙", "꿀", "후추", "사워도우", "샐러드 채소", "리코타 치즈", "방울토마토"],
    cookingTime: 10, difficulty: "special", cookingMethod: "noFire", effortLevel: "low", recommendationType: "special", isSpecial: true,
    recommendationReasons: ["불 없이도 분위기 있는 한 끼가 돼요.", "10분이면 플레이팅까지 끝나요.", "추가 구매 재료는 3개예요."],
    steps: ["채소와 방울토마토를 씻어 담아요.", "리코타 치즈와 양파를 올려요.", "올리브유와 레몬즙 드레싱을 뿌려요."],
  }),
  recipe({
    id: "recipe-pork-steak", name: "목살 스테이크와 구운 채소",
    requiredIngredients: ["목살", "양파", "당근", "버터", "소금", "후추"], optionalIngredients: ["아스파라거스", "방울토마토"],
    cookingTime: 25, difficulty: "special", cookingMethod: "fire", effortLevel: "medium", recommendationType: "special", isSpecial: true,
    recommendationReasons: ["목살을 평소보다 근사하게 즐겨요.", "냉장고 채소를 곁들일 수 있어요.", "추가 구매 없이도 만들 수 있어요."],
    steps: ["목살에 소금과 후추로 밑간해요.", "팬에 목살을 앞뒤로 노릇하게 구워요.", "버터와 채소를 넣고 함께 구워 담아요."],
  }),
];

export const recipeDifficultyLabels = { easy: "간단", normal: "보통", special: "스페셜" };
export const cookingMethodLabels = { noFire: "불 없이 가능", fire: "불 사용" };
