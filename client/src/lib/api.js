const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
let csrfToken = null;
let sessionRequest = null;

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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method ?? 'GET')
          ? { 'X-CSRF-Token': csrfToken }
          : {}),
        ...options.headers,
      },
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

export function getSession() {
  if (!sessionRequest) {
    sessionRequest = request('/api/auth/session')
      .then((session) => {
        csrfToken = session.csrfToken;
        return session.user;
      })
      .finally(() => {
        sessionRequest = null;
      });
  }
  return sessionRequest;
}

export async function loginWithGoogle(credential) {
  const session = await request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  csrfToken = session.csrfToken;
  return session.user;
}

export function getBooks() {
  return request('/api/bookshelf');
}

export function getReadingActivity({ from, to }) {
  return request(`/api/reading-activity?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export function searchBooks(query) {
  return request(`/api/books/search?q=${encodeURIComponent(query.trim())}`);
}

export function createBook({ providerId, initialPage }) {
  return request('/api/books', {
    method: 'POST',
    body: JSON.stringify({ providerId, initialPage }),
  });
}

export function getBook(bookId) {
  return request(`/api/books/${bookId}`);
}

export function createReadingRecord({
  bookId,
  endPage,
  startPageOverride,
  impression,
  readingDurationSeconds,
  quoteText,
  quoteExposureId,
}) {
  return request(`/api/books/${bookId}/records`, {
    method: 'POST',
    body: JSON.stringify({
      endPage,
      startPageOverride: startPageOverride || null,
      impression: impression || null,
      readingDurationSeconds: readingDurationSeconds ?? null,
      quoteText: quoteText || null,
      quoteExposureId: quoteExposureId ?? null,
    }),
  });
}

export function updateReadingRecord({ bookId, recordId, endPage, impression }) {
  return request(`/api/books/${bookId}/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ endPage, impression: impression || null }),
  });
}

export function deleteReadingRecord({ bookId, recordId }) {
  return request(`/api/books/${bookId}/records/${recordId}`, {
    method: 'DELETE',
  });
}

export function updateBookStatus({ bookId, status, finalReview }) {
  return request(`/api/books/${bookId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, finalReview: finalReview?.trim() || null }),
  });
}

export function getRandomQuote() {
  return request('/api/quotes/random');
}

export function createQuoteExposure(quoteId) {
  return request('/api/quote-exposures', {
    method: 'POST',
    body: JSON.stringify({ quoteId }),
  });
}

export function openQuoteExposure(exposureId) {
  return request(`/api/quote-exposures/${exposureId}/open`, { method: 'POST' });
}
