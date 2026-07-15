const BASE = '/api/v1';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const message = body?.error?.message || `요청 실패 (${res.status})`;
    throw new Error(message);
  }
  return body.data;
}

export function createRepository(repositoryUrl) {
  return request('/repositories', {
    method: 'POST',
    body: JSON.stringify({ repository_url: repositoryUrl }),
  });
}

export function createInterview(repositoryId) {
  return request('/interviews', {
    method: 'POST',
    body: JSON.stringify({ repository_id: repositoryId }),
  });
}

export function sendMessage(interviewId, answer) {
  return request(`/interviews/${interviewId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  });
}

export function exportMarkdownUrl(interviewId) {
  return `${BASE}/interviews/${interviewId}/export/md`;
}
