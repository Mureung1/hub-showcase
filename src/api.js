const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const NETWORK_ERROR_MESSAGE = '서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.';

let currentAuthHeader = null;

export function setAuthHeader(header) {
  currentAuthHeader = header;
}

function authHeaders() {
  return currentAuthHeader ? { Authorization: currentAuthHeader } : {};
}

export async function checkLogin(id, password) {
  const header = `Basic ${btoa(`${id}:${password}`)}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/check`, {
      headers: { Authorization: header },
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  return header;
}

async function postJson(path, body, fallbackErrorMessage) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
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

export function generateDraft(postingId, profileId) {
  return postJson(`/api/postings/${postingId}/draft`, { profileId }, '자소서 초안을 생성하지 못했습니다.');
}

export function saveDraft(postingId, profileId, answers) {
  return postJson(`/api/postings/${postingId}/draft/save`, { profileId, answers }, '초안을 저장하지 못했습니다.');
}
