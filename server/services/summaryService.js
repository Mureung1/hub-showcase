export const SYSTEM_PROMPT = `너는 사용자의 하루 감정 텍스트를 정리하는 도구다.

반드시 지킬 규칙:
- 상담, 진단, 위로, 평가, 훈계, 과도한 공감을 하지 않는다.
- 사용자가 쓰지 않은 사실을 지어내지 않는다.
- emotion, cause, action 세 문자열만 가진 JSON 객체로 답한다.
- emotion: 입력에서 드러난 감정 이름을 짧게 정리한다.
- cause: 감정이 생긴 상황이나 원인을 입력 근거 안에서 정리한다.
- action: 내일 시도할 수 있는 아주 작은 행동 하나를 중립적으로 적는다.
- Markdown 코드 블록이나 추가 설명을 붙이지 않는다.`

export function createMockSummary(rawText) {
  const trimmedText = rawText.trim()

  return {
    emotion: '정리되지 않은 피로감',
    cause: `입력한 내용에서 반복적으로 신경 쓰인 상황: ${trimmedText.slice(0, 80)}`,
    action: '내일 가장 먼저 확인할 일 하나를 짧게 적어둔다.',
  }
}

function parseSummary(content) {
  const trimmed = content.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')

  if (start === -1 || end === -1) {
    throw new Error('AI 응답에서 JSON 객체를 찾지 못했습니다.')
  }

  const parsed = JSON.parse(withoutFence.slice(start, end + 1))
  const fields = ['emotion', 'cause', 'action']

  for (const field of fields) {
    if (typeof parsed[field] !== 'string' || !parsed[field].trim()) {
      throw new Error(`AI 응답의 ${field} 값이 올바르지 않습니다.`)
    }
  }

  return {
    emotion: parsed.emotion.trim(),
    cause: parsed.cause.trim(),
    action: parsed.action.trim(),
  }
}

async function callLiteLLM(rawText, { fetchImpl = fetch } = {}) {
  const baseUrl = (process.env.AI_BASE_URL || 'http://127.0.0.1:4000/v1').replace(/\/$/, '')
  const model = process.env.AI_MODEL || 'vertex-gemini-flash'
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 45000
  const maxTokens = Number(process.env.AI_MAX_TOKENS) || 1200
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const headers = { 'Content-Type': 'application/json' }

  if (process.env.AI_API_KEY) {
    headers.Authorization = `Bearer ${process.env.AI_API_KEY}`
  }

  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: rawText.trim() },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`LiteLLM 요청 실패 (${response.status})`)
    }

    const body = await response.json()
    const content = body.choices?.[0]?.message?.content

    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('LiteLLM 응답 내용이 비어 있습니다.')
    }

    return parseSummary(content)
  } finally {
    clearTimeout(timeout)
  }
}

export async function createSummary(rawText, options) {
  const retryCount = Number(process.env.AI_GENERATION_RETRIES ?? 1)
  let lastError

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const summary = await callLiteLLM(rawText, options)
      return { ...summary, source: 'ai' }
    } catch (error) {
      lastError = error
      if (attempt < retryCount) {
        console.warn(`[AI retry ${attempt + 1}/${retryCount}] ${error.message}`)
      }
    }
  }

  console.warn(`[AI mock fallback] ${lastError.message}`)
  return { ...createMockSummary(rawText), source: 'mock' }
}
