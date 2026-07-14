// Vite dev-server 프록시가 /api/*를 백엔드(localhost:4000)로 넘겨주므로 상대 경로로 호출한다.
// filters는 반드시 객체로 보내야 한다 — 백엔드의 applyFilters(jobs, filters = {})는 undefined일 때만
// 기본값이 적용되고 null을 넘기면 filters.job_category 접근에서 그대로 터진다.
export async function postGapAnalysis({ filters = {}, spec }) {
  const res = await fetch('/api/gap-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, spec }),
  })
  if (!res.ok) {
    throw new Error(`갭 분석 요청에 실패했습니다 (${res.status})`)
  }
  return res.json()
}
