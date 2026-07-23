const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.message ?? '요청을 처리하지 못했어요. 다시 시도해 주세요.', {
      code: body?.code,
      status: response.status,
    });
  }

  return body;
}

export function createUser({ nickname }) {
  return request('/api/users', {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });
}

export function getBooks(userId, status = 'READING') {
  return request(`/api/users/${userId}/books?status=${encodeURIComponent(status)}`);
}

export function searchBooks(query) {
  return request(`/api/books/search?q=${encodeURIComponent(query.trim())}`);
}

export function createBook({ userId, providerId, initialPage }) {
  return request('/api/books', {
    method: 'POST',
    body: JSON.stringify({ userId, providerId, initialPage }),
  });
}

export function getBook(bookId, userId) {
  return request(`/api/books/${bookId}?userId=${encodeURIComponent(userId)}`);
}

export function createReadingRecord({ bookId, userId, endPage, startPageOverride, impression, readingDurationSeconds }) {
  return request(`/api/books/${bookId}/records`, {
    method: 'POST',
    body: JSON.stringify({ userId, endPage, startPageOverride: startPageOverride || null, impression: impression || null, readingDurationSeconds: readingDurationSeconds ?? null }),
  });
}

export function updateReadingRecord({ bookId, recordId, userId, endPage, impression }) {
  return request(`/api/books/${bookId}/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, endPage, impression: impression || null }),
  });
}

export function deleteReadingRecord({ bookId, recordId, userId }) {
  return request(`/api/books/${bookId}/records/${recordId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function updateBookStatus({ bookId, userId, status, finalReview }) {
  return request(`/api/books/${bookId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, status, finalReview: finalReview?.trim() || null }),
  });
}
