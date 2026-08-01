export const SYSTEM_PROMPT = `너는 사용자의 하루 감정 텍스트를 정리하는 도구다.

반드시 지킬 규칙:
- 상담, 진단, 위로, 평가, 훈계, 과도한 공감을 하지 않는다.
- 사용자가 쓰지 않은 사실을 지어내지 않는다.
- emotion, cause, action, emotionReason, causeReason, actionReason 여섯 문자열만 가진 JSON 객체로 답한다.
- emotion: 입력에서 드러난 감정 이름을 짧게 정리한다.
- cause: 감정이 생긴 상황이나 원인을 입력 근거 안에서 정리한다.
- action: 내일 시도할 수 있는 아주 작은 행동 하나를 중립적으로 적는다.
- emotionReason, causeReason, actionReason: 각 항목을 왜 그렇게 정리했는지 사용자가 쓴 표현을 근거로 1~2문장으로 설명한다. 조언이나 위로를 덧붙이지 않는다.
- Markdown 코드 블록이나 추가 설명을 붙이지 않는다.`

export const REPORT_SYSTEM_PROMPT = `너는 여러 날의 감정 기록을 사용자가 스스로 돌아볼 수 있게 정리하는 도구다.

반드시 지킬 규칙:
- 상담, 진단, 치료, 질환 추정, 위기 판단, 위로, 평가, 훈계를 하지 않는다.
- 입력에 없는 사실이나 감정의 원인을 지어내지 않는다.
- overview, pattern, nextFocus 세 문자열만 가진 JSON 객체로 답한다.
- overview: 기록 전체에서 보이는 흐름을 2문장 이내로 중립적으로 정리한다.
- pattern: 반복해서 나타난 감정, 원인 또는 작은 행동을 입력 근거 안에서 2문장 이내로 정리한다. 반복을 판단할 기록이 부족하면 그 사실을 말한다.
- nextFocus: 다음 기록에서 스스로 살펴볼 만한 한 가지를 질문 형태의 1문장으로 적는다.
- 사용자를 단정하지 않고 "기록에서는", "살펴볼 수 있어요"처럼 제한적으로 표현한다.
- Markdown 코드 블록이나 추가 설명을 붙이지 않는다.`

export function createMockSummary(rawText) {
  const trimmedText = rawText.trim()

  return {
    emotion: '정리되지 않은 피로감',
    cause: `입력한 내용에서 반복적으로 신경 쓰인 상황: ${trimmedText.slice(0, 80)}`,
    action: '내일 가장 먼저 확인할 일 하나를 짧게 적어둔다.',
    emotionReason: '입력한 문장에서 드러난 감정 표현을 그대로 짧게 옮겼어요.',
    causeReason: '입력에서 상황으로 언급된 부분을 원인으로 정리했어요.',
    actionReason: '내일 바로 시도할 수 있는 작은 행동 하나로 좁혀서 적었어요.',
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

  // reason 필드는 선택 사항 — 빠져 있어도 mock fallback을 트리거하지 않는다.
  const optionalText = (value) => (typeof value === 'string' ? value.trim() : '')

  return {
    emotion: parsed.emotion.trim(),
    cause: parsed.cause.trim(),
    action: parsed.action.trim(),
    emotionReason: optionalText(parsed.emotionReason),
    causeReason: optionalText(parsed.causeReason),
    actionReason: optionalText(parsed.actionReason),
  }
}

function parseReportAnalysis(content) {
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
  const fields = ['overview', 'pattern', 'nextFocus']

  for (const field of fields) {
    if (typeof parsed[field] !== 'string' || !parsed[field].trim()) {
      throw new Error(`AI 응답의 ${field} 값이 올바르지 않습니다.`)
    }
  }

  return Object.fromEntries(fields.map((field) => [field, parsed[field].trim()]))
}

async function callLiteLLM(rawText, {
  fetchImpl = fetch,
  systemPrompt = SYSTEM_PROMPT,
  parse = parseSummary,
} = {}) {
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
          { role: 'system', content: systemPrompt },
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

    return parse(content)
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

export async function createReportAnalysis(reportText, options) {
  const retryCount = Number(process.env.AI_GENERATION_RETRIES ?? 1)
  let lastError

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const analysis = await callLiteLLM(reportText, {
        ...options,
        systemPrompt: REPORT_SYSTEM_PROMPT,
        parse: parseReportAnalysis,
      })
      return { ...analysis, source: 'ai' }
    } catch (error) {
      lastError = error
      if (attempt < retryCount) {
        console.warn(`[AI report retry ${attempt + 1}/${retryCount}] ${error.message}`)
      }
    }
  }

  console.warn(`[AI report failed] ${lastError.message}`)
  const error = new Error('AI 전체 흐름 정리를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
  error.status = 503
  throw error
}
