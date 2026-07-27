import { ApiError } from './ApiError';
import { API_BASE_URL } from './config';

export async function saveDiagnosis(
  symptomIds: number[],
  ingredientIds: number[],
  token: string
): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE_URL}/diagnoses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symptomIds, ingredientIds }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? '진단 결과 저장에 실패했습니다.', res.status);
  }
  return data;
}
