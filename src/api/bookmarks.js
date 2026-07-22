import { supabase } from '../lib/supabaseClient'
import { throwWithServerMessage } from './gapAnalysis'

// 북마크 API는 로그인이 필요하므로 매 호출 시 현재 세션의 액세스 토큰을 읽어
// Authorization 헤더에 실어 보낸다 — Express의 requireSupabaseAuth가 이를 검증한다.
async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getBookmarks() {
  const res = await fetch('/api/bookmarks', { headers: await authHeaders() })
  if (!res.ok) {
    await throwWithServerMessage(res, `북마크 목록을 불러오지 못했습니다 (${res.status})`)
  }
  return res.json()
}

export async function addBookmark(jobId) {
  const res = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ job_id: jobId }),
  })
  if (!res.ok) {
    await throwWithServerMessage(res, `북마크 추가에 실패했습니다 (${res.status})`)
  }
  return res.json()
}

// 북마크한 공고를 "북마크했을 때의 스펙"이 아니라 "지금 Context에 저장된 최신 스펙" 기준으로
// 재평가해서 받아온다 — 응답 모양이 POST /api/gap-analysis의 jobList 원소와 동일( { job, checks, overallMatch } )해서
// 기존 buildJobDisplay를 그대로 재사용할 수 있다.
export async function evaluateBookmarks(spec) {
  const res = await fetch('/api/bookmarks/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ spec }),
  })
  if (!res.ok) {
    await throwWithServerMessage(res, `북마크 공고 재평가에 실패했습니다 (${res.status})`)
  }
  return res.json()
}

export async function removeBookmark(jobId) {
  const res = await fetch(`/api/bookmarks/${jobId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    await throwWithServerMessage(res, `북마크 삭제에 실패했습니다 (${res.status})`)
  }
}
