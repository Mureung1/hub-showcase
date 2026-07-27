import { ApiError } from './ApiError';

export interface RecommendedIngredient {
  id: number;
  name: string;
  category: string | null;
  upperLimitMg: string | null;
  description: string | null;
  matchCount: number;
}

export async function getRecommendedIngredients(symptomIds: number[]): Promise<RecommendedIngredient[]> {
  const res = await fetch(`/ingredients/recommend?symptomIds=${symptomIds.join(',')}`);
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? '추천 성분을 불러오지 못했습니다.', res.status);
  }
  return data.recommendedIngredients;
}
