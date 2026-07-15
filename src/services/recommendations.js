const recommendationResults = [
  { id: "best", label: "BEST 추천", description: "보유 재료 활용도가 가장 높은 메뉴", menuId: "tofu-kimchi-bowl" },
  { id: "budget", label: "예산 추천", description: "추가 구매 재료가 적은 메뉴", menuId: "egg-rice" },
  { id: "nutrition", label: "영양 추천", description: "영양 균형을 고려한 메뉴", menuId: "protein-bowl" },
  { id: "quick", label: "빠른 조리", description: "짧은 시간에 만들 수 있는 메뉴", menuId: "quick-egg-rice" },
];

export function fetchRecommendationResults(ingredients) {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (ingredients.some((ingredient) => ingredient.name === "오류 테스트")) {
        reject(new Error("추천 메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
        return;
      }

      if (ingredients.length === 0) {
        resolve([]);
        return;
      }

      resolve(recommendationResults);
    }, 450);
  });
}
