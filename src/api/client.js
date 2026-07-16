import { useCallback, useEffect, useState } from 'react'

// 서버 API 호출 래퍼 — 비 2xx 응답이면 서버가 준 error 메시지로 throw
export async function api(path) {
  const res = await fetch(path)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `요청 실패 (${res.status})`)
  }
  return res.json()
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
