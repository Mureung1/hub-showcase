// apiUrl()이 VITE_API_BASE_URL 설정 여부에 따라 상대 경로(로컬, Vite 프록시)와
// 완전한 URL(배포, 프론트/백엔드 분리 origin)을 둘 다 지원한다 — src/api/config.js 참고.
// filters는 반드시 객체로 보내야 한다 — 백엔드의 applyFilters(jobs, filters = {})는 undefined일 때만
// 기본값이 적용되고 null을 넘기면 filters.job_category 접근에서 그대로 터진다.
import { apiUrl } from './config'

// 백엔드가 400 등으로 { error: '...' } 형태의 본문을 내려주면 그 메시지를 그대로 쓰고,
// JSON이 아니거나 error 필드가 없으면(네트워크 오류 등) 상태 코드 기반 기본 메시지로 대체한다.
export async function throwWithServerMessage(res, fallback) {
  let message = fallback
  try {
    const body = await res.json()
    if (body?.error) message = body.error
  } catch {
    // 응답 본문이 JSON이 아닌 경우(예: 서버 자체가 안 떠 있음) 기본 메시지를 유지한다.
  }
  throw new Error(message)
}

export async function postGapAnalysis({ filters = {}, spec }) {
  const res = await fetch(apiUrl('/api/gap-analysis'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, spec }),
  })
  if (!res.ok) {
    await throwWithServerMessage(res, `갭 분석 요청에 실패했습니다 (${res.status})`)
  }
  return res.json()
}

export async function getGapAnalysis(id) {
  const res = await fetch(apiUrl(`/api/gap-analysis/${id}`))
  if (!res.ok) {
    await throwWithServerMessage(res, `분석 결과를 불러오지 못했습니다 (${res.status})`)
  }
  return res.json()
}
