const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

// Claude에게 tool 하나를 강제로 호출시켜서(tool_choice) 구조화된 JSON만 받는다.
// 실패하면 그대로 던진다 — 호출부에서 안 잡고, errorHandler가 500 ANALYSIS_FAILED로 응답한다(기획서.md 8-5).
export async function callClaudeTool({ tool, userMessage }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되어 있지 않습니다.')
  }

  const res = await fetch(ANTHROPIC_API_URL, {
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
  })

  if (!res.ok) {
    throw new Error(`Claude API 호출 실패 (status ${res.status})`)
  }

  const data = await res.json()
  const toolUse = data.content?.find((block) => block.type === 'tool_use')
  if (!toolUse) {
    throw new Error('Claude API 응답에서 분석 결과를 찾을 수 없습니다.')
  }
  return toolUse.input
}
