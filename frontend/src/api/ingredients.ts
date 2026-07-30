import { ApiError } from './ApiError';
import { API_BASE_URL } from './config';

export interface RecommendedIngredient {
  id: number;
  name: string;
  category: string | null;
  upperLimitMg: string | null;
  description: string | null;
  matchCount: number;
}

export async function getRecommendedIngredients(symptomIds: number[], token: string): Promise<RecommendedIngredient[]> {
  const res = await fetch(`${API_BASE_URL}/ingredients/recommend?symptomIds=${symptomIds.join(',')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? '추천 성분을 불러오지 못했습니다.', res.status);
  }
  return data.recommendedIngredients;
}
