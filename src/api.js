const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export async function submitProfile(profile) {
  const response = await fetch(`${API_BASE_URL}/api/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '추천 공고를 불러오지 못했습니다.');
  }

  return data;
}
