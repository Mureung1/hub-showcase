// 상호 평가 API(3단계).
import { request } from './client.js'

// GET /api/evaluations/pending — { items, count } 반환.
export function fetchPendingEvaluations() {
  return request('/api/evaluations/pending')
}

// POST /api/meetings/:id/evaluations — evaluations는 [{ rateeId, attended, tags }].
export function submitEvaluations(meetingId, evaluations) {
  return request(`/api/meetings/${encodeURIComponent(meetingId)}/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evaluations }),
  })
}
