import { useCallback, useEffect, useState } from 'react'

// 프론트와 API가 같은 오리진(Vercel 한 프로젝트)이라 상대경로 /api 로 호출한다.
// GET 호출 래퍼 — 비 2xx면 서버가 준 error 메시지로 throw. 세션 쿠키를 함께 보낸다.
export async function api(path) {
  const res = await fetch(path, { credentials: 'same-origin' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const err = new Error(body?.error ?? `요청 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// 본문을 보내는 호출(POST 등) — 세션 쿠키 포함, 비 2xx면 서버 error 메시지로 throw
export async function apiSend(path, method, body) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => null)
    const err = new Error(b?.error ?? `요청 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

export const apiPost = (path, body) => apiSend(path, 'POST', body)
export const apiDelete = (path) => apiSend(path, 'DELETE')

// 파일 업로드(multipart) — FormData를 그대로 보낸다. Content-Type은 지정하지 않아야
// 브라우저가 boundary를 붙인다. 비 2xx면 서버 error 메시지로 throw.
export async function apiUpload(path, formData) {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', body: formData })
  if (!res.ok) {
    const b = await res.json().catch(() => null)
    const err = new Error(b?.error ?? `요청 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

// GET 데이터 로딩 훅 — 로딩/에러/데이터 3상태 + 재시도
export function useApi(path) {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  const reload = useCallback(() => {
    setState({ loading: true, error: null, data: null })
    api(path)
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((err) => setState({ loading: false, error: err.message, data: null }))
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}

// ISO 시각 → "n분 전 / n시간 전 / n일 전"
export function timeAgo(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}
