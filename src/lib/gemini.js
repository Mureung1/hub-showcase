// geminiComplete() 공통 헬퍼 (프록시 /api/gemini 경유), parseJsonLoose() 응답 JSON 파싱 헬퍼
import { fetchWithTimeout } from './fetchWithTimeout.js'

// schema/schemaName: OpenRouter 구조화 출력(response_format: json_schema)으로 응답 형식을 강제한다
//   (스키마 정의는 geminiSchemas.js). 서버가 스키마 강제 실패 시 스키마 없이 재시도하므로,
//   호출부는 여전히 parseJsonLoose + 검증 함수로 응답을 확인해야 한다.
// temperature: 수치 추정 호출은 낮게(일관성), 추천 문구 호출은 조금 높게(다양성) — geminiSchemas.js 표 참고.
export async function geminiComplete({ prompt, system, imageBase64, mimeType, schema, schemaName, temperature } = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('prompt is required')
  }

  const res = await fetchWithTimeout('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system, imageBase64, mimeType, schema, schemaName, temperature }),
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
      // 우리 프록시 자체 레이트리밋(1분/10분 윈도우, proxy.js의 고정 안내 문구)의 429는 몇 초
      // 백오프로 풀리지 않는다 — 재시도 없이 바로 안내로 전환하고, 업스트림(OpenRouter) 429만 재시도한다.
      const isOwnRateLimit = typeof err.message === 'string' && err.message.includes('요청이 너무 많습니다')
      if (err.status === 429 && !isOwnRateLimit && attempt < RATE_LIMIT_RETRY_DELAYS_MS.length) {
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
