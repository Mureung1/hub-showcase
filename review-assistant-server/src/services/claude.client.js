const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const REQUEST_TIMEOUT_MS = 15000

// Claude에게 tool 하나를 강제로 호출시켜서(tool_choice) 구조화된 JSON만 받는다.
// 실패 원인(타임아웃/네트워크/인증/응답 파싱 실패)은 로그에만 구분해서 남기고,
// 호출부에는 그대로 Error를 던진다 — errorHandler가 전부 500 ANALYSIS_FAILED로 매핑한다
// (기획서.md 8-5: 새 에러 코드를 추가하지 않고 기존 체계를 재사용하기로 확정된 설계).
export async function callClaudeTool({ tool, userMessage }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되어 있지 않습니다.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Claude API 응답이 ${REQUEST_TIMEOUT_MS}ms 안에 오지 않아 타임아웃 처리했습니다.`)
    }
    throw new Error(`Claude API 호출 중 네트워크 오류가 발생했습니다: ${err.message}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    throw new Error(`Claude API 호출 실패 (status ${res.status})`)
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Claude API 응답 파싱에 실패했습니다 (유효한 JSON이 아님).')
  }

  const toolUse = data.content?.find((block) => block.type === 'tool_use')
  if (!toolUse) {
    throw new Error('Claude API 응답에서 분석 결과를 찾을 수 없습니다.')
  }
  return toolUse.input
}
