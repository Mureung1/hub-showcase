// geminiComplete() 공통 헬퍼 (프록시 /api/gemini 경유), parseJsonLoose() 응답 JSON 파싱 헬퍼
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function geminiComplete({ prompt, system, imageBase64, mimeType } = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('prompt is required')
  }

  const res = await fetchWithTimeout('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system, imageBase64, mimeType }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(data?.error || `Gemini request failed (${res.status})`)
    err.status = res.status
    throw err
  }

  return data?.text ?? ''
}

// OpenRouter가 429(레이트리밋)를 반환하면 지수 백오프로 최대 2회까지 조용히 자동 재시도한다.
// 그래도 실패하면 err.status를 보고 호출부가 안내 문구로 전환한다.
// 503 등 일시 오류는 서버(proxy.js fetchWithRetry)가 이미 업스트림에 3회 재시도하므로,
// 클라이언트에서 또 재시도하면 지연만 배가된다 — 여기서는 429만 잡는다.
const RATE_LIMIT_RETRY_DELAYS_MS = [1500, 3000]

export async function geminiCompleteWithRetry(args) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await geminiComplete(args)
    } catch (err) {
      if (err.status === 429 && attempt < RATE_LIMIT_RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_DELAYS_MS[attempt]))
        continue
      }
      throw err
    }
  }
}

export function parseJsonLoose(text) {
  if (typeof text !== 'string') return null

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()

  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null

    try {
      return JSON.parse(candidate.slice(start, end + 1))
    } catch {
      return null
    }
  }
}
