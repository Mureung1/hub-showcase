const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const TIMEOUT_MS = 10000

// Groq(OpenAI 호환) chat completions 호출 — JSON 객체 응답을 강제하고 파싱까지 해서 반환.
// 실패(타임아웃·네트워크·형식 오류) 시 예외를 던진다 — 호출부에서 폴백 처리.
export async function chatJSON(messages) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    throw new Error(`Groq API 오류: ${res.status}`)
  }

  const body = await res.json()
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq 응답에 content가 없어요')

  return JSON.parse(content)
}
