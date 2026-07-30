// FR-6 — Meal-Bot 대화형 AI 영양사. /api/gemini와 완전히 분리된 /api/chat 전용 리미터를 쓰므로(서버
// 쪽은 server/proxy.js의 handleGeminiRequest 공유 참고), 챗봇을 많이 써도 사진 분석 기능이 잠기지
// 않는다. gemini.js(geminiComplete)는 건드리지 않고 같은 요청/응답 패턴만 여기서 새로 따라간다 —
// 두 라우트가 같은 핸들러를 공유하므로 요청 모양(prompt/system)도 동일해야 한다.
import { fetchWithTimeout } from './fetchWithTimeout.js'
import { NUTRIENT_LABELS } from './nutrition.js'
import { MEDICAL_LANGUAGE_RULE } from './prompts/dietAnalysis.js'

// 한 번의 요청에 실어 보내는 과거 대화 수(과금·프롬프트 길이 상한 — 비용이 실제로 느는 유일한
// 확장 기능이라 대화가 길어져도 무한정 커지지 않게 최근 것만 쓴다).
const MAX_HISTORY_TURNS = 6

// dailyContext: { recommended, todayTotal } — UserContext의 effectiveRecommended/todayMealsTotal을
// 그대로 넘겨받는다. 새로 계산하지 않고 이미 있는 값만 문장으로 옮긴다.
export function buildChatSystemPrompt(dailyContext) {
  const { recommended, todayTotal } = dailyContext || {}
  const lines = NUTRIENT_LABELS.map(({ key, label, unit }) => {
    const rec = recommended?.[key]
    const actual = todayTotal?.[key]
    if (typeof rec !== 'number' || typeof actual !== 'number') return null
    return `${label} ${actual}${unit}(권장 ${rec}${unit})`
  }).filter(Boolean)
  const contextLine = lines.length > 0 ? `오늘 섭취: ${lines.join(', ')}.` : '사용자의 오늘 섭취 기록이 아직 없습니다.'

  return `당신은 Mealyze 앱의 친근한 영양 상담 도우미입니다. ${contextLine}
이 수치를 참고해 답하되, 모르는 사실은 지어내지 말고 일반적인 영양 상식으로 답하세요.
${MEDICAL_LANGUAGE_RULE}
답변은 2~4문장, 존댓말로 짧고 친근하게 하세요.`
}

// history: [{role: 'user'|'bot', text}, ...] — 오래된 것부터. 최근 MAX_HISTORY_TURNS개만 프롬프트에 싣는다.
export function buildChatUserPrompt(message, history = []) {
  const recent = history.slice(-MAX_HISTORY_TURNS)
  if (recent.length === 0) return message

  const transcript = recent.map((turn) => `${turn.role === 'user' ? '사용자' : '챗봇'}: ${turn.text}`).join('\n')
  return `[이전 대화]\n${transcript}\n\n[새 질문]\n${message}`
}

export async function sendChatMessage({ message, history = [], dailyContext } = {}) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('message is required')
  }

  const res = await fetchWithTimeout('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: buildChatUserPrompt(message.trim(), history),
      system: buildChatSystemPrompt(dailyContext),
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error || `Chat request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data?.text ?? ''
}
