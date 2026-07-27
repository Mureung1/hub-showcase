import { ApiError } from './ApiError';
import { API_BASE_URL } from './config';

export interface MatchedProduct {
  id: number;
  name: string;
  companyName: string | null;
  price: number | null;
  description: string | null;
  haccpCertified: boolean;
  smartstoreUrl: string | null;
  testReportUrl: string | null;
  matchCount: number;
  matchedIngredientNames: string[];
  exceedsPersonalLimit: boolean;
  pregnancyCaution: boolean;
}

export async function getMatchedProducts(ingredientIds: number[], token: string): Promise<MatchedProduct[]> {
  const res = await fetch(`${API_BASE_URL}/products/match?ingredientIds=${ingredientIds.join(',')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? '추천 제품을 불러오지 못했습니다.', res.status);
  }
  return data.matchedProducts;
}
