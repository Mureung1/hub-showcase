const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const NETWORK_ERROR_MESSAGE = '서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.';

async function postJson(path, body, fallbackErrorMessage) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(data.error || fallbackErrorMessage);
  }

  return data;
}

export function submitProfile(profile) {
  return postJson('/api/profiles', profile, '추천 공고를 불러오지 못했습니다.');
}

export function generateDraft(postingId, profile) {
  return postJson(`/api/postings/${postingId}/draft`, { profile }, '자소서 초안을 생성하지 못했습니다.');
}
