const RECOMMENDATIONS_API_URL = "/api/recommendations";

export class RecommendationRequestError extends Error {
  constructor(message, { code = "RECOMMENDATION_REQUEST_FAILED", status = 500 } = {}) {
    super(message);
    this.name = "RecommendationRequestError";
    this.code = code;
    this.status = status;
  }
}

export async function fetchRecommendations({
  mode = "quick",
  maxMissingIngredients = 0,
  excludedRecipeFingerprints = [],
  signal,
} = {}) {
  const response = await fetch(RECOMMENDATIONS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      maxMissingIngredients,
      batchSize: 3,
      excludedRecipeFingerprints,
      allergens: [],
      excludedIngredients: [],
      dietaryPreferences: [],
    }),
    signal,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RecommendationRequestError(
      result?.error?.message ?? "레시피 추천을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      { code: result?.error?.code, status: response.status },
    );
  }

  return result;
}
