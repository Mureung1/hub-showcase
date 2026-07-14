const MOCK_RESPONSE_DELAY = 450;

export function registerIngredient(ingredient) {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (ingredient.name === "오류 테스트") {
        reject(new Error("재료 등록에 실패했습니다. 잠시 후 다시 시도해주세요."));
        return;
      }

      resolve({ ...ingredient, id: Date.now() });
    }, MOCK_RESPONSE_DELAY);
  });
}
