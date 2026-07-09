import Anthropic from "@anthropic-ai/sdk"

// Model choice: claude-haiku-4-5 — summarization, sentence extraction, and
// expression explanation are short, repetitive, structured-output tasks,
// so a lightweight/cost-efficient model is a better fit than a larger one.
// See CLAUDE.md "LLM 제공자 선택 이유" for the full rationale.
const MODEL = "claude-haiku-4-5"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// TODO: build the real prompt (article text in, 3-line Korean summary +
// key-sentence extraction out) and parse the model's structured response.
export async function summarizeArticle(_articleText) {
  throw new Error("summarizeArticle: not implemented yet")
}

// Feature B — 난이도별 콘텐츠/표현 조절 (docs/plan.md 기능 B).
// TODO: prompt Claude for level-appropriate ("basic" | "mid" | "high")
// expression explanations for the day's key sentences.
export async function explainSentences(level) {
  return [
    {
      en: "Apple raised its guidance for iPhone production after strong demand for AI-powered features.",
      kr: "애플은 AI 기능에 대한 강한 수요에 힘입어 아이폰 생산 가이던스를 상향했다.",
      highlight: "guidance",
      explanation:
        level === "high"
          ? "guidance는 forecast보다 더 공식적이고 책임 있는 뉘앙스를 가집니다."
          : "guidance = 회사가 발표하는 실적 전망치.",
    },
  ]
}

// TODO: prompt Claude for today's investment-term mini glossary (screen 6,
// fixed difficulty — see plan.md 기능 B "적용 범위").
export async function explainTerms() {
  return [
    {
      term: "Guidance (가이던스)",
      definition: "기업이 향후 실적에 대해 공식적으로 제시하는 전망치.",
      context: "오늘 기사에서 애플은 아이폰 생산 가이던스를 상향 조정했다고 밝혔어요.",
    },
  ]
}

/** Thin wrapper kept here so every LLM call goes through one client/model config. */
export async function callClaude(prompt, options = {}) {
  return client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? 1024,
    messages: [{ role: "user", content: prompt }],
  })
}
