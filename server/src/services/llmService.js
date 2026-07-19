import Anthropic from "@anthropic-ai/sdk"
import { randomUUID } from "node:crypto"
import { appendVocabulary } from "./vocabularyStore.js"

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
    definition: "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다.",
  },
  {
    term: "ticker",
    definition: "특정 종목을 표시하는 알파벳 코드(종목 코드)입니다.",
  },
  {
    term: "guidance",
    definition: "기업이 향후 실적에 대해 스스로 제시하는 전망치입니다.",
  },
  {
    term: "sell-off",
    definition: "투자자들이 한꺼번에 주식을 팔아치우는 현상입니다.",
  },
]

// 구조상 어려운 문장만 선별해 번역+이유를 붙인다(전체 문장이 아님).
const SENTENCE_GLOSSARY = [
  {
    id: "s1",
    text: "The decline accelerated after GlobalTech Corp, whose ticker symbol is GTC, issued weaker-than-expected guidance for the upcoming quarter, citing softening demand and rising component costs.",
    translation:
      "GlobalTech Corp(티커: GTC)가 다가오는 분기에 대해 예상보다 약한 가이던스를 발표하면서, 수요 둔화와 부품 비용 상승을 이유로 들자 하락세가 가속화됐습니다.",
    reason: "주어(GlobalTech Corp)에 동격구(whose ticker symbol is GTC)와 분사구(citing...)가 겹쳐 구조 파악이 어려운 문장",
  },
  {
    id: "s2",
    text: "Trading desks described the reaction as an emotional sell-off rather than a fundamental shift in the industry, noting that trading volume was roughly triple the 30-day average.",
    translation:
      "트레이딩 데스크는 이번 반응을 업계의 근본적인 변화라기보다 감정적인 매도세로 봤으며, 거래량이 30일 평균의 약 3배에 달했다고 언급했습니다.",
    reason: "'A rather than B' 비교 구문과 분사구(noting that...)가 이어져 구조 파악이 어려운 문장",
  },
]

// 성공 더미 응답 — analyzeArticle의 정상 반환값과 동일한 구조를 만든다.
function mockAnalyzeSuccess(text) {
  const terms = TERM_GLOSSARY.filter(({ term }) => text.toLowerCase().includes(term))
  const sentences = SENTENCE_GLOSSARY.filter(({ text: sentenceText }) => text.includes(sentenceText))

  return {
    sentences,
    terms,
    summaryBullets: [
      "기술주 전반이 급락하며 베어마켓 우려가 커지고 있습니다.",
      "GlobalTech Corp(GTC)의 약한 실적 가이던스가 하락을 가속시켰습니다.",
      "전문가들은 단기 변동성은 있어도 장기 매수 기회로 보는 시각도 있다고 분석합니다.",
    ],
    insight:
      "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
    marketSentiment: "bearish",
  }
}

// 단어장 적재는 analyzeArticle의 응답과 무관한 부수 효과다 — 여기서 실패해도
// terms/sentences/summaryBullets/insight/marketSentiment 응답 자체는 그대로
// 반환돼야 하므로 실패를 삼킨다. userId가 없으면(비로그인) 저장 자체를
// 건너뛴다 — 단어장은 사용자별 데이터라 로그인 없이는 저장할 곳이 없다.
async function saveTermsToVocabulary(terms, articleTitle, articleUrl, userId) {
  if (!userId) return

  try {
    for (const { term, definition } of terms) {
      await appendVocabulary(userId, term, definition, articleTitle, articleUrl)
    }
  } catch (err) {
    console.warn("[llmService] failed to save terms to vocabulary:", err.message)
  }
}

// TODO(3주차): 실제 Claude 호출로 교체 — 문단 텍스트를 프롬프트에 넣어
// 용어 탐지 + 3줄 한글 요약 + 주가 영향 한 줄 해설을 구조화된 JSON으로
// 받아오도록 프롬프트/파싱을 구현한다(callClaude 사용). MOCK_LLM 분기는 그대로
// 두고 이 TODO 자리만 실제 로직으로 교체하면 된다.
export async function analyzeArticle(paragraphs, { title, url, userId } = {}) {
  const text = paragraphs.join(" ")

  let analysis
  if (MOCK_LLM) {
    if (text.includes("FAIL_TEST")) {
      throw new Error("[MOCK_LLM] Claude API 호출 실패를 흉내낸 테스트용 에러입니다.")
    }
    analysis = mockAnalyzeSuccess(text)
  } else {
    analysis = mockAnalyzeSuccess(text)
  }

  await saveTermsToVocabulary(analysis.terms, title, url, userId)

  return analysis
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

function buildSelectionPrompt(candidates) {
  const list = candidates.map((c, i) => `${i + 1}. [${c.source}] ${c.title}`).join("\n")

  return `당신은 초보 투자자를 위한 모의 투자 학습 서비스의 에디터입니다. 아래는 최근 금융/경제 외신 헤드라인 후보 목록입니다.

${list}

이 중 오늘 가장 중요한 3건을 선정하세요. 가능하면 주제나 업종이 겹치지 않게 다양화하세요. 각 헤드라인을 자연스러운 한국어 한 줄로 의역하세요(직역 금지). 언급된 기업의 티커 심볼이 헤드라인에 명확히 드러나지 않으면 tickers는 반드시 빈 배열로 두세요(추정 금지).

다른 설명 없이 아래 JSON 배열 형식으로만 답하세요:
[
  { "index": 후보 번호(숫자), "translation": "한국어 한 줄 번역", "tickers": ["$TICKER"] }
]`
}

function parseSelectionResponse(response, candidates) {
  const text = response.content?.[0]?.text ?? ""
  const cleaned = text.replace(/```json|```/g, "").trim()
  const selections = JSON.parse(cleaned)

  if (!Array.isArray(selections) || selections.length !== 3) {
    throw new Error("selectTopArticles: unexpected LLM response shape")
  }

  return selections.map(({ index, translation, tickers }) => {
    const candidate = candidates[index - 1]
    if (!candidate) throw new Error(`selectTopArticles: index ${index} out of range`)

    return {
      id: randomUUID(),
      source: candidate.source,
      sourceInitial: candidate.sourceInitial,
      headline: candidate.title,
      translation,
      tickers: Array.isArray(tickers) ? tickers : [],
      url: candidate.link,
    }
  })
}

function mockSelectTop3(candidates) {
  return candidates.slice(0, 3).map((c) => ({
    id: randomUUID(),
    source: c.source,
    sourceInitial: c.sourceInitial,
    headline: c.title,
    translation: `[MOCK] ${c.title}`,
    tickers: [],
    url: c.link,
  }))
}

// RSS로 모은 후보 헤드라인 중 "오늘의 핵심 3개"를 선별하고 한글 한 줄
// 번역+티커 추정을 붙인다. LLM에는 후보 번호만 돌려받아(index 기반) 서버가
// 원본 candidate에서 headline/url을 그대로 채운다 — LLM이 URL/제목을
// 새로 지어내는 환각을 원천 차단하기 위함.
export async function selectTopArticles(candidates) {
  if (MOCK_LLM) {
    if (candidates.some((c) => c.title.includes("FAIL_TEST"))) {
      throw new Error("[MOCK_LLM] Claude API 호출 실패를 흉내낸 테스트용 에러입니다.")
    }
    return mockSelectTop3(candidates)
  }

  const prompt = buildSelectionPrompt(candidates)
  const response = await callClaude(prompt, { maxTokens: 1024 })
  return parseSelectionResponse(response, candidates)
}
