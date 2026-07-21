export interface OverlapResult {
  ingredientId: number;
  ingredientName: string;
  totalAmountMg: number | null;
  upperLimitMg: number | null;
  isExceeded: boolean;
  message: string;
}

export async function checkOverlap(productNames: string[]): Promise<OverlapResult[]> {
  const res = await fetch('/products/check-overlap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productNames }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? '중복 체크에 실패했습니다.');
  }
  return data.overlapResults;
}
