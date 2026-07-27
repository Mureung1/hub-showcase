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
    excerpt:
      "Shares of major technology companies fell sharply on Friday as investors grew increasingly worried that the market is entering a bear market.",
    excerptTranslation:
      "금요일 주요 기술주들이 급락했는데, 투자자들이 시장이 약세장에 진입하고 있다는 우려를 점점 더 키웠기 때문입니다.",
  },
  {
    term: "ticker",
    definition: "특정 종목을 표시하는 알파벳 코드(종목 코드)입니다.",
    excerpt:
      "The decline accelerated after GlobalTech Corp, whose ticker symbol is GTC, issued weaker-than-expected guidance for the upcoming quarter, citing softening demand and rising component costs.",
    excerptTranslation:
      "GlobalTech Corp(티커: GTC)가 다가오는 분기에 대해 예상보다 약한 가이던스를 발표하면서, 수요 둔화와 부품 비용 상승을 이유로 들자 하락세가 가속화됐습니다.",
  },
  {
    term: "guidance",
    definition: "기업이 향후 실적에 대해 스스로 제시하는 전망치입니다.",
    excerpt:
      "The decline accelerated after GlobalTech Corp, whose ticker symbol is GTC, issued weaker-than-expected guidance for the upcoming quarter, citing softening demand and rising component costs.",
    excerptTranslation:
      "GlobalTech Corp(티커: GTC)가 다가오는 분기에 대해 예상보다 약한 가이던스를 발표하면서, 수요 둔화와 부품 비용 상승을 이유로 들자 하락세가 가속화됐습니다.",
  },
  {
    term: "sell-off",
    definition: "투자자들이 한꺼번에 주식을 팔아치우는 현상입니다.",
    excerpt:
      "The broad sell-off wiped out nearly a trillion dollars in market value across the sector in a single trading session.",
    excerptTranslation:
      "광범위한 매도세로 단 하루 거래 세션 만에 해당 섹터 시가총액 약 1조 달러가 증발했습니다.",
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

// 성공 더미 응답 — fast/slow lane의 정상 반환값과 동일한 구조를 각각 만든다.
function mockFastAnalysisSuccess(text) {
  const sentences = SENTENCE_GLOSSARY.filter(({ text: sentenceText }) => text.includes(sentenceText))

  return {
    sentences,
    summaryBullets: [
      "기술주 전반이 급락하며 베어마켓 우려가 커지고 있습니다.",
      "GlobalTech Corp(GTC)의 약한 실적 가이던스가 하락을 가속시켰습니다.",
      "전문가들은 단기 변동성은 있어도 장기 매수 기회로 보는 시각도 있다고 분석합니다.",
    ],
  }
}

function mockSlowAnalysisSuccess(text) {
  const terms = TERM_GLOSSARY.filter(({ term }) => text.toLowerCase().includes(term))

  return {
    terms,
    insight:
      "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
    marketSentiment: "bearish",
  }
}

// 단어장 적재는 analyzeArticle의 응답과 무관한 부수 효과다 — 여기서 실패해도
// terms/sentences/summaryBullets/insight/marketSentiment 응답 자체는 그대로
// 반환돼야 하므로 실패를 삼킨다. userId가 없으면(비로그인) 저장 자체를
// 건너뛴다 — 단어장은 사용자별 데이터라 로그인 없이는 저장할 곳이 없다.
export async function saveTermsToVocabulary(terms, articleTitle, articleUrl, userId) {
  if (!userId) return

  try {
    for (const { term, definition, excerpt, excerptTranslation } of terms) {
      await appendVocabulary(userId, term, definition, articleTitle, articleUrl, excerpt, excerptTranslation)
    }
  } catch (err) {
    console.warn("[llmService] failed to save terms to vocabulary:", err.message)
  }
}

const MARKET_SENTIMENTS = ["bullish", "bearish", "neutral"]

// Claude가 "원문 그대로 복사하라"는 지시를 받고도 스마트 따옴표 치환이나
// 공백 정규화를 하는 경우가 있다. 정확한 substring이 아니라 이런 변형을
// 허용하는 정규식으로 바꿔 원문에서 실제 부분 문자열을 역으로 찾아낸다.
export function buildFuzzyPattern(candidateText) {
  return candidateText
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/["'“”‘’]/g, `["'“”‘’]`)
    .replace(/\s+/g, "\\s+")
}

// sentences[].text를 검증만 하는 게 아니라 원문 그대로의 substring으로
// "복구"한다 — Reader.jsx가 paragraph.includes(s.text)로 엄격하게 매칭하므로,
// LLM이 낸 값을 그대로 쓰면 공백·따옴표가 살짝만 달라도 프론트에서 조용히
// 아코디언이 무력화된다(에러 없이 그냥 평문으로 렌더링됨).
export function findVerbatimMatch(paragraphs, candidateText) {
  let pattern
  try {
    pattern = new RegExp(buildFuzzyPattern(candidateText))
  } catch {
    return null
  }
  for (const paragraph of paragraphs) {
    const match = paragraph.match(pattern)
    if (match) return match[0]
  }
  return null
}

function xmlWrapParagraphs(paragraphs) {
  return paragraphs.map((p, i) => `<paragraph id="${i + 1}">\n${p}\n</paragraph>`).join("\n\n")
}

// 리더뷰가 즉시 필요로 하는 두 필드(sentences/summaryBullets)만 받는 프롬프트.
// 문단은 <paragraph> XML 태그로 감싸 문단 경계를 모델이 엄격하게 인식하게 하고
// (문단을 가로지르는 문장 복사 방지), 문장 verbatim 복사에 대한 지시를 여러
// 각도(재타이핑 금지, 따옴표 변환 금지, 공백 정규화 금지)로 반복해 명시한다.
// terms/insight/marketSentiment는 판단 전까지 화면에 안 쓰이거나(블라인드)
// 부수효과(단어장)일 뿐이라 별도 프롬프트(buildSlowAnalysisPrompt)로 분리해
// critical path를 줄인다.
export function buildFastAnalysisPrompt(paragraphs, title) {
  const xmlParagraphs = xmlWrapParagraphs(paragraphs)
  // 상한을 절대값(4)으로 고정하면 긴 기사일수록 선별 커버리지가 떨어진다.
  // 문단 수에 비례해 상한을 늘리되, sentences는 verbatim 에코 비용이 있어
  // fast lane 응답 지연에 직결되므로 6개로 다시 상한을 둔다.
  const maxSentences = Math.min(6, Math.max(4, Math.ceil(paragraphs.length / 2)))

  return `당신은 영문 뉴스 기반 해외 주식 모의투자 학습 서비스의 AI 어시스턴트입니다. 아래는 기사 제목과 원문 문단입니다. 각 문단은 <paragraph> 태그로 감싸져 있습니다.

제목: ${title ?? "(제목 없음)"}

${xmlParagraphs}

위 원문을 바탕으로 아래 2가지 작업을 한 번에 수행하세요.

1. sentences — 영어 문장 구조상 초보 학습자가 읽기 어려운 문장을 2~${maxSentences}개 선별합니다. 예: 길게 이어진 주어+동격구/분사구문, 'A rather than B' 같은 비교 구문, 삽입절 등 구조가 복잡한 문장.
   - "text" 필드는 반드시 위 원문에서 글자 하나, 공백 하나, 문장부호 하나까지 정확히 그대로 복사한 값이어야 합니다. 절대로 다시 타이핑하거나, 의역하거나, 요약하거나, 일부 단어만 잘라내거나, 여러 문장을 이어붙이지 마세요.
   - 곧은따옴표(", ')를 스마트따옴표(", ", ', ')로 바꾸지 마세요. 원문에 있는 그대로 유지하세요.
   - 문장 안에 큰따옴표(")가 포함되어 있다면, 그 앞에 반드시 백슬래시를 붙여 \\" 로 이스케이프하세요(JSON 문자열 규칙을 지키기 위한 이스케이프이며, 문장 내용을 바꾸는 것이 아닙니다). 이스케이프를 빠뜨리면 JSON 파싱이 깨집니다.
   - 연속된 공백이나 줄바꿈을 하나로 합치거나 다듬지 마세요. 원문의 공백을 그대로 복사하세요.
   - 선택한 문장은 반드시 하나의 <paragraph> 태그 안에만 온전히 포함되어야 하며, 두 문단에 걸쳐 있으면 안 됩니다.
   - "translation"은 자연스러운 한국어 번역, "reason"은 이 문장이 왜 구조적으로 어려운지 한국어로 한 줄 설명입니다(40자 이내).

2. summaryBullets — 기사 내용을 객관적 사실 위주로 정확히 3개의 한국어 문장으로 요약하세요(의견이나 추측이 아닌 기사에 실제로 나온 사실 기준, 각 문장 60자 이내). 반드시 3개의 문자열을 담은 배열이어야 하며, 객체나 번호를 매긴 하나의 문자열로 합쳐서 반환하지 마세요.

다른 설명 없이, 아래 JSON 형식으로만 답하세요(코드블록 표시 없이 순수 JSON만):
{
  "sentences": [
    { "text": "원문 그대로 복사한 문장", "translation": "한국어 번역", "reason": "구조가 어려운 이유" }
  ],
  "summaryBullets": ["...", "...", "..."]
}`
}

// 판단 전까지 블라인드 처리되는 insight/marketSentiment와, 화면에 직접 안 쓰이는
// 단어장 부수효과용 terms를 받는 프롬프트. fast lane과 별개 호출이라 원문
// 문단을 다시 포함해야 한다(verbatim 매칭에 필요).
export function buildSlowAnalysisPrompt(paragraphs, title) {
  const xmlParagraphs = xmlWrapParagraphs(paragraphs)

  return `당신은 영문 뉴스 기반 해외 주식 모의투자 학습 서비스의 AI 어시스턴트입니다. 아래는 기사 제목과 원문 문단입니다. 각 문단은 <paragraph> 태그로 감싸져 있습니다.

제목: ${title ?? "(제목 없음)"}

${xmlParagraphs}

위 원문을 바탕으로 아래 3가지 작업을 한 번에 수행하세요.

1. terms — 기사 전체에서 초보 투자자가 알아야 할 핵심 금융/투자 용어를 3~5개 선별하세요. "term"은 원문에 등장한 영어 표현 그대로, "definition"은 초보자를 위한 한국어 설명입니다(50자 이내). "excerpt"는 해당 term이 등장한 문장을 원문에서 정확히 그대로 복사한 값입니다(재타이핑·의역·일부 발췌 금지, 스마트따옴표 변환 금지, 공백 정규화 금지, 하나의 <paragraph> 안에 온전히 포함). "excerptTranslation"은 그 excerpt 문장을 자연스러운 한국어로 번역한 값입니다.

2. insight — 이 뉴스가 관련 종목 또는 섹터의 주가에 어떤 영향을 미칠 수 있는지 한국어 한 문장으로 해설하세요(80자 이내).

3. marketSentiment — 기사 본문의 객관적인 톤을 판별해 "bullish", "bearish", "neutral" 중 정확히 하나만 소문자 영문으로 답하세요(다른 표현이나 대문자 사용 금지).

다른 설명 없이, 아래 JSON 형식으로만 답하세요(코드블록 표시 없이 순수 JSON만):
{
  "terms": [
    { "term": "영어 용어", "definition": "한국어 설명", "excerpt": "원문 그대로 복사한 문장", "excerptTranslation": "그 문장의 한국어 번역" }
  ],
  "insight": "...",
  "marketSentiment": "bullish"
}`
}

// buildFastAnalysisPrompt 응답 파서. 최상위 필드는 형태가 어긋나면 통째로
// throw하지만(스키마 자체를 무시했다는 신호), sentences 개별 원소는 조용히
// 필터링한다 — 배열 일부가 깨졌다고 전체 분석을 버리기엔 비용이 너무 크다.
export function parseFastAnalysisResponse(response, paragraphs) {
  const text = response.content?.[0]?.text ?? ""
  const cleaned = text.replace(/```json|```/g, "").trim()
  const parsed = JSON.parse(cleaned)

  const { sentences, summaryBullets } = parsed ?? {}

  if (!Array.isArray(sentences) || !Array.isArray(summaryBullets)) {
    throw new Error("computeFastAnalysis: unexpected LLM response shape")
  }

  const fieldValidSentences = sentences.filter(
    (s) =>
      s &&
      typeof s.text === "string" &&
      s.text.length > 0 &&
      typeof s.translation === "string" &&
      s.translation.length > 0 &&
      typeof s.reason === "string" &&
      s.reason.length > 0,
  )
  const verbatimResolved = fieldValidSentences.map((s) => ({ ...s, text: findVerbatimMatch(paragraphs, s.text) }))
  const verbatimMatched = verbatimResolved.filter((s) => s.text !== null)

  const seenSentenceText = new Set()
  const validSentences = verbatimMatched
    .filter((s) => {
      if (seenSentenceText.has(s.text)) return false
      seenSentenceText.add(s.text)
      return true
    })
    .map((s, i) => ({ id: `s${i + 1}`, text: s.text, translation: s.translation, reason: s.reason }))

  // sentences 손실 계측: "모델이 애초에 적게 냈는지" vs "검증 단계(원문
  // 완전일치)에서 깎였는지"를 로그만으로 구분할 수 있도록 단계별 개수를 남긴다.
  if (validSentences.length < sentences.length) {
    console.warn(
      `[llmService] sentences loss: raw=${sentences.length} fieldValid=${fieldValidSentences.length} verbatimMatched=${verbatimMatched.length} final=${validSentences.length}`,
    )
  }

  const validBullets = summaryBullets.filter((b) => typeof b === "string" && b.length > 0)
  if (validBullets.length !== 3) {
    console.warn(`[llmService] summaryBullets expected 3, got ${validBullets.length}`)
  }

  return {
    sentences: validSentences,
    summaryBullets: validBullets,
  }
}

// buildSlowAnalysisPrompt 응답 파서. marketSentiment가 enum을 벗어나면
// "neutral"로 폴백한다(사용자의 투자 판단과 비교되는 값이라 잘못된 값을
// 보여주는 것보다 중립값이 안전).
export function parseSlowAnalysisResponse(response, paragraphs) {
  const text = response.content?.[0]?.text ?? ""
  const cleaned = text.replace(/```json|```/g, "").trim()
  const parsed = JSON.parse(cleaned)

  const { terms, insight, marketSentiment } = parsed ?? {}

  if (
    !Array.isArray(terms) ||
    typeof insight !== "string" ||
    insight.trim().length === 0 ||
    typeof marketSentiment !== "string"
  ) {
    throw new Error("computeSlowAnalysis: unexpected LLM response shape")
  }

  const validTerms = terms
    .filter(
      (t) =>
        t &&
        typeof t.term === "string" &&
        t.term.length > 0 &&
        typeof t.definition === "string" &&
        t.definition.length > 0,
    )
    .map(({ term, definition, excerpt, excerptTranslation }) => {
      const matchedExcerpt = typeof excerpt === "string" ? findVerbatimMatch(paragraphs, excerpt) : null
      const hasTranslation = typeof excerptTranslation === "string" && excerptTranslation.trim().length > 0
      return {
        term,
        definition,
        excerpt: matchedExcerpt,
        excerptTranslation: matchedExcerpt && hasTranslation ? excerptTranslation.trim() : null,
      }
    })

  const normalizedSentiment = marketSentiment.trim().toLowerCase()
  const safeSentiment = MARKET_SENTIMENTS.includes(normalizedSentiment) ? normalizedSentiment : "neutral"
  if (safeSentiment !== normalizedSentiment) {
    console.warn(`[llmService] unexpected marketSentiment "${marketSentiment}", falling back to "neutral"`)
  }

  return {
    terms: validTerms,
    insight: insight.trim(),
    marketSentiment: safeSentiment,
  }
}

// 리더뷰가 인터랙티브 뷰(원문+아코디언+요약+판단버튼)로 전환하는 데 필요한
// 최소 데이터만 반환한다 — 단어장 저장 부수효과는 여기 없다(computeSlowAnalysis 쪽).
export async function computeFastAnalysis(paragraphs, title) {
  const text = paragraphs.join(" ")

  if (MOCK_LLM) {
    if (text.includes("FAIL_TEST")) {
      throw new Error("[MOCK_LLM] Claude API 호출 실패를 흉내낸 테스트용 에러입니다.")
    }
    return mockFastAnalysisSuccess(text)
  }

  const prompt = buildFastAnalysisPrompt(paragraphs, title)
  const response = await callClaude(prompt, { maxTokens: 2048 })
  try {
    return parseFastAnalysisResponse(response, paragraphs)
  } catch (err) {
    console.error(`[llmService] computeFastAnalysis parse failed: ${err.message}`)
    console.error(`[llmService] raw response text:\n${response.content?.[0]?.text ?? "(no text)"}`)
    throw err
  }
}

// 판단 버튼을 누르기 전까지 블라인드 처리되는 필드(insight/marketSentiment)와
// 단어장 자동 저장용 terms를 반환한다. 리더뷰 렌더링을 막지 않고 백그라운드로
// 돌기 때문에, fast lane보다 늦게 끝나도 대부분 독해 시간 안에 흡수된다.
export async function computeSlowAnalysis(paragraphs, title) {
  const text = paragraphs.join(" ")

  if (MOCK_LLM) {
    if (text.includes("FAIL_TEST")) {
      throw new Error("[MOCK_LLM] Claude API 호출 실패를 흉내낸 테스트용 에러입니다.")
    }
    return mockSlowAnalysisSuccess(text)
  }

  const prompt = buildSlowAnalysisPrompt(paragraphs, title)
  const response = await callClaude(prompt, { maxTokens: 2048 })
  try {
    return parseSlowAnalysisResponse(response, paragraphs)
  } catch (err) {
    console.error(`[llmService] computeSlowAnalysis parse failed: ${err.message}`)
    console.error(`[llmService] raw response text:\n${response.content?.[0]?.text ?? "(no text)"}`)
    throw err
  }
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

// 검증 스크립트(validateAnalysisPrompt.js) 전용 — TTFT/총 생성시간을 재려면
// 스트리밍이 필요하다(비스트리밍 callClaude는 첫 토큰 도착 시점을 관측할
// 수 없음). finalMessage()가 비스트리밍 응답과 동일한 모양(content/usage)을
// 반환하므로 parseAnalysisResponse를 그대로 재사용할 수 있다.
export async function callClaudeWithMetrics(prompt, options = {}) {
  const startedAt = Date.now()
  let ttftMs = null

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: options.maxTokens ?? 1024,
    messages: [{ role: "user", content: prompt }],
  })
  stream.on("text", () => {
    if (ttftMs === null) ttftMs = Date.now() - startedAt
  })

  const response = await stream.finalMessage()
  const totalMs = Date.now() - startedAt

  return { response, ttftMs, totalMs }
}

// 3단계 통과 기준. 투자가치는 "시장에 영향을 주는 정보인가"를, 독해적합성은
// "학습용으로 문장이 읽을 만한가"를 본다 — 하나만 높아서는 카드로 채택하지
// 않는다.
const MIN_INVESTMENT_SCORE = 4
const MIN_READABILITY_SCORE = 3

function buildEvaluationPrompt(candidates) {
  const list = candidates
    .map((c, i) => `${i + 1}. [${c.source}] ${c.title}\n${c.bodyText}`)
    .join("\n\n---\n\n")

  return `당신은 초보 투자자를 위한 모의 투자 학습 서비스의 에디터입니다. 아래는 1~2단계 필터(URL/분량 검증)를 통과한 CNBC 기사 후보와 본문입니다.

${list}

각 기사를 다음 두 기준으로 1~5점 평가하세요:
- investmentScore: 단순 이슈성 기사인가, 아니면 시장 변동성/기업 가치/산업 흐름에 직접적인 영향을 주는 정보인가?
- readabilityScore: 문장 구조가 명확하고 비즈니스/금융 필수 어휘가 잘 갖춰져 학습자가 읽기에 적합한가?

각 기사의 주제/섹터를 sector 필드에 짧은 영단어 태그로 표기하세요(예: "macro", "tech", "earnings", "semiconductor"). 각 헤드라인을 자연스러운 한국어 한 줄로 의역하세요(직역 금지). 언급된 기업의 티커 심볼이 헤드라인에 명확히 드러나지 않으면 tickers는 반드시 빈 배열로 두세요(추정 금지).

다른 설명 없이, 후보 전체에 대해 아래 JSON 배열 형식으로만 답하세요:
[
  { "index": 후보 번호(숫자), "investmentScore": 1~5, "readabilityScore": 1~5, "sector": "짧은 주제 태그", "translation": "한국어 한 줄 번역", "tickers": ["$TICKER"] }
]`
}

function toCard(candidate, { translation, tickers, readabilityScore }) {
  return {
    id: randomUUID(),
    source: candidate.source,
    sourceInitial: candidate.sourceInitial,
    headline: candidate.title,
    translation,
    tickers: Array.isArray(tickers) ? tickers : [],
    url: candidate.link,
    readabilityScore,
  }
}

// 점수 통과 후보 중 investmentScore 내림차순으로 최대 3건을 뽑되, 섹터가
// 겹치면 건너뛰어 다양성을 우선한다. 서로 다른 섹터가 3개가 안 되면(예:
// 오늘따라 전부 실적 시즌 기사) 남은 자리는 점수 순으로 채운다.
export function pickDiversifiedTop3(evaluated) {
  const sorted = [...evaluated].sort((a, b) => b.investmentScore - a.investmentScore)
  const picked = []
  const usedSectors = new Set()

  for (const item of sorted) {
    if (picked.length >= 3) break
    if (usedSectors.has(item.sector)) continue
    picked.push(item)
    usedSectors.add(item.sector)
  }

  if (picked.length < 3) {
    for (const item of sorted) {
      if (picked.length >= 3) break
      if (picked.includes(item)) continue
      picked.push(item)
    }
  }

  return picked
}

function parseEvaluationResponse(response, candidates) {
  const text = response.content?.[0]?.text ?? ""
  const cleaned = text.replace(/```json|```/g, "").trim()
  const evaluations = JSON.parse(cleaned)

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    throw new Error("evaluateAndSelectArticles: unexpected LLM response shape")
  }

  const evaluated = evaluations.map(({ index, investmentScore, readabilityScore, sector, translation, tickers }) => {
    const candidate = candidates[index - 1]
    if (!candidate) throw new Error(`evaluateAndSelectArticles: index ${index} out of range`)
    return { candidate, investmentScore, readabilityScore, sector, translation, tickers }
  })

  const passed = evaluated.filter(
    (e) => e.investmentScore >= MIN_INVESTMENT_SCORE && e.readabilityScore >= MIN_READABILITY_SCORE,
  )
  if (passed.length === 0) {
    throw new Error("evaluateAndSelectArticles: no candidates passed score thresholds")
  }

  return pickDiversifiedTop3(passed).map((e) => toCard(e.candidate, e))
}

const MOCK_READABILITY_SCORES = [5, 4, 3]

function mockEvaluateAndSelectTop3(candidates) {
  return candidates
    .slice(0, 3)
    .map((c, index) =>
      toCard(c, { translation: `[MOCK] ${c.title}`, tickers: [], readabilityScore: MOCK_READABILITY_SCORES[index % 3] }),
    )
}

// 2단계까지 통과한 후보(본문 포함)를 investmentScore/readabilityScore로
// 평가하고, 통과한 후보 중 점수순+섹터 다양화로 최종 3건을 뽑아 한글 한 줄
// 번역+티커 추정을 붙인다. LLM에는 후보 번호만 돌려받아(index 기반) 서버가
// 원본 candidate에서 headline/url을 그대로 채운다 — LLM이 URL/제목을
// 새로 지어내는 환각을 원천 차단하기 위함.
export async function evaluateAndSelectArticles(candidates) {
  if (MOCK_LLM) {
    if (candidates.some((c) => c.title.includes("FAIL_TEST"))) {
      throw new Error("[MOCK_LLM] Claude API 호출 실패를 흉내낸 테스트용 에러입니다.")
    }
    return mockEvaluateAndSelectTop3(candidates)
  }

  const prompt = buildEvaluationPrompt(candidates)
  const response = await callClaude(prompt, { maxTokens: 2048 })
  return parseEvaluationResponse(response, candidates)
}
