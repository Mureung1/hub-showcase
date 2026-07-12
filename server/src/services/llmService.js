import Anthropic from "@anthropic-ai/sdk"

// Model choice: claude-haiku-4-5 — 요약/용어 해설/인사이트 생성은 짧고
// 반복적이며 출력 형식이 정형화된 작업이라 경량 모델이 더 적합하다.
// See CLAUDE.md "LLM 제공자 선택 이유" for the full rationale.
const MODEL = "claude-haiku-4-5"

// MOCK_LLM=true면 Claude API를 실제로 호출하지 않는다 — 로컬 개발/통합 테스트
// 중 과금·Rate Limit 부담 없이 작업하기 위함. FAIL_TEST 문자열을 파라미터에
// 포함시키면 의도적으로 실패 케이스를 트리거할 수 있다(프론트 에러 UI 테스트용).
// See CLAUDE.md "구현 유의사항 · LLM 호출 비용 관리".
const MOCK_LLM = process.env.MOCK_LLM === "true"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TERM_GLOSSARY = [
  {
    term: "bear market",
    metaphor: "곰이 앞발로 내려찍는 모습에서 유래했어요.",
    definition: "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다.",
  },
  {
    term: "ticker",
    metaphor: "주식의 이름표 같은 거예요.",
    definition: "특정 종목을 표시하는 알파벳 코드(종목 코드)입니다.",
  },
  {
    term: "guidance",
    metaphor: "회사가 미리 알려주는 일기예보 같은 거예요.",
    definition: "기업이 향후 실적에 대해 스스로 제시하는 전망치입니다.",
  },
  {
    term: "sell-off",
    metaphor: "다들 급하게 짐을 챙겨 나가는 모습이에요.",
    definition: "투자자들이 한꺼번에 주식을 팔아치우는 현상입니다.",
  },
]

// 성공 더미 응답 — analyzeArticle의 정상 반환값과 동일한 구조를 만든다.
function mockAnalyzeSuccess(text) {
  const terms = TERM_GLOSSARY.filter(({ term }) => text.toLowerCase().includes(term))

  return {
    terms,
    summaryBullets: [
      "기술주 전반이 급락하며 베어마켓 우려가 커지고 있습니다.",
      "GlobalTech Corp(GTC)의 약한 실적 가이던스가 하락을 가속시켰습니다.",
      "전문가들은 단기 변동성은 있어도 장기 매수 기회로 보는 시각도 있다고 분석합니다.",
    ],
    insight:
      "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
  }
}

// TODO(3주차): 실제 Claude 호출로 교체 — 문단 텍스트를 프롬프트에 넣어
// 용어 탐지 + 3줄 한글 요약 + 주가 영향 한 줄 해설을 구조화된 JSON으로
// 받아오도록 프롬프트/파싱을 구현한다(callClaude 사용). MOCK_LLM 분기는 그대로
// 두고 이 TODO 자리만 실제 로직으로 교체하면 된다.
export async function analyzeArticle(paragraphs) {
  const text = paragraphs.join(" ")

  if (MOCK_LLM) {
    if (text.includes("FAIL_TEST")) {
      throw new Error("[MOCK_LLM] Claude API 호출 실패를 흉내낸 테스트용 에러입니다.")
    }
    return mockAnalyzeSuccess(text)
  }

  return mockAnalyzeSuccess(text)
}

/**
 * Thin wrapper kept here so every real LLM call goes through one client/model
 * config. MOCK_LLM=true일 때는 실제 네트워크 호출 없이 Anthropic Messages API와
 * 동일한 모양의 더미 응답을 반환한다(3주차에 이 함수를 직접 호출하는 코드가
 * 추가돼도 별도 처리 없이 Mock 모드 보호를 받는다).
 */
export async function callClaude(prompt, options = {}) {
  if (MOCK_LLM) {
    if (prompt.includes("FAIL_TEST")) {
      throw new Error("[MOCK_LLM] Claude API 호출 실패를 흉내낸 테스트용 에러입니다.")
    }
    return {
      id: "mock-msg-id",
      type: "message",
      role: "assistant",
      model: MODEL,
      content: [{ type: "text", text: "[MOCK_LLM] 더미 응답입니다." }],
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    }
  }

  return client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? 1024,
    messages: [{ role: "user", content: prompt }],
  })
}
