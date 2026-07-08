// geminiComplete() 공통 헬퍼 (프록시 /api/gemini 경유), parseJsonLoose() 응답 JSON 파싱 헬퍼

export async function geminiComplete({ prompt, system, imageBase64, mimeType } = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('prompt is required')
  }

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system, imageBase64, mimeType }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `Gemini request failed (${res.status})`)
  }

  return data?.text ?? ''
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
