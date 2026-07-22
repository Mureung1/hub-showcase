export interface MatchedProduct {
  id: number;
  name: string;
  companyName: string | null;
  price: number | null;
  haccpCertified: boolean;
  smartstoreUrl: string | null;
  testReportUrl: string | null;
  matchCount: number;
}

export async function getMatchedProducts(ingredientIds: number[]): Promise<MatchedProduct[]> {
  const res = await fetch(`/products/match?ingredientIds=${ingredientIds.join(',')}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? '추천 제품을 불러오지 못했습니다.');
  }
  return data.matchedProducts;
}
