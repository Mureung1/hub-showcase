import "dotenv/config"
import { FALLBACK_ARTICLE } from "../src/services/articleParser.js"
import { buildAnalysisPrompt, callClaude, parseAnalysisResponse } from "../src/services/llmService.js"

// analyzeArticle 배선(#14) 전, buildAnalysisPrompt가 실제 Claude 응답에서도
// 기대한 JSON 형식(문장 verbatim 매칭/summaryBullets 3개/marketSentiment enum)을
// 안정적으로 만족하는지 여러 샘플 기사로 반복 확인하기 위한 일회성 스크립트.
// 실행: MOCK_LLM=false node scripts/validateAnalysisPrompt.js (server/ 안에서)

if (process.env.MOCK_LLM === "true") {
  console.error(
    "[validateAnalysisPrompt] MOCK_LLM=true 상태입니다. 이 스크립트는 실제 Claude 호출을 검증하는 용도이므로, " +
      "server/.env의 MOCK_LLM을 false로 바꾸거나 `MOCK_LLM=false node scripts/validateAnalysisPrompt.js`로 실행하세요.",
  )
  process.exit(1)
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "[validateAnalysisPrompt] ANTHROPIC_API_KEY가 비어 있습니다. server/.env에 실제 키를 채운 뒤 다시 실행하세요.",
  )
  process.exit(1)
}

const samples = [
  {
    label: "실적 발표형 (FALLBACK_ARTICLE)",
    title: FALLBACK_ARTICLE.title,
    paragraphs: FALLBACK_ARTICLE.paragraphs,
  },
  {
    label: "거시경제형",
    title: "Fed Holds Rates Steady but Signals Caution on Inflation Path",
    paragraphs: [
      "The Federal Reserve left its benchmark interest rate unchanged on Wednesday, extending a pause that has now lasted three consecutive meetings, even as policymakers acknowledged that progress on inflation has been slower than they had hoped earlier this year.",
      "In the post-meeting statement, the central bank removed language suggesting further tightening was likely, a shift that some economists interpreted as an implicit acknowledgment that the current rate level is sufficiently restrictive, though officials stopped short of committing to a timeline for cuts.",
      "Chair Jerome Powell told reporters that the committee would rather hold rates too high for too long than ease prematurely and risk reigniting price pressures, a stance that disappointed traders who had been pricing in a September rate cut with roughly 70% probability.",
      "Bond yields rose modestly following the announcement, and the dollar strengthened against a basket of major currencies, while equity markets closed mixed as investors weighed the prospect of a longer period of elevated borrowing costs against still-resilient corporate earnings.",
    ],
  },
  {
    label: "개별 종목 뉴스형",
    title: "Streamly Shares Jump 18% After Surprise Subscriber Growth",
    paragraphs: [
      "Shares of streaming service Streamly Inc. surged as much as 18% in after-hours trading on Thursday after the company reported quarterly subscriber growth of 4.2 million, far outpacing the 1.8 million analysts had projected, and raised its full-year guidance for the second time this year.",
      "Chief executive Mara Lindqvist attributed the beat to the company's expansion into live sports rights and a password-sharing crackdown that, rather than driving users away as some critics predicted, pushed a meaningful share of former account-sharers into paid individual plans.",
      "The results stand in contrast to a sluggish quarter for several of Streamly's peers, several of which have flagged slowing growth in mature markets, and analysts at multiple banks moved quickly to raise price targets, with one calling the quarter \"a decisive rebuttal\" to bearish theses on the sector.",
    ],
  },
]

function formatSentenceCheck(sentences, paragraphs) {
  return sentences
    .map((s) => {
      const foundVerbatim = paragraphs.some((p) => p.includes(s.text))
      return `    - [${foundVerbatim ? "OK" : "MISMATCH"}] "${s.text.slice(0, 60)}${s.text.length > 60 ? "..." : ""}"`
    })
    .join("\n")
}

async function runSample(sample) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`샘플: ${sample.label}`)
  console.log(`제목: ${sample.title}`)
  console.log("=".repeat(70))

  const prompt = buildAnalysisPrompt(sample.paragraphs, sample.title)
  const response = await callClaude(prompt, { maxTokens: 3072 })
  const analysis = parseAnalysisResponse(response, sample.paragraphs)

  console.log(`\n[sentences] 선별 ${analysis.sentences.length}개 (verbatim 매칭 결과)`)
  console.log(formatSentenceCheck(analysis.sentences, sample.paragraphs))

  console.log(`\n[terms] ${analysis.terms.length}개`)
  analysis.terms.forEach((t) => console.log(`    - ${t.term}: ${t.definition}`))

  console.log(`\n[summaryBullets] ${analysis.summaryBullets.length}개 (기대: 3) ${analysis.summaryBullets.length === 3 ? "OK" : "MISMATCH"}`)
  analysis.summaryBullets.forEach((b, i) => console.log(`    ${i + 1}. ${b}`))

  console.log(`\n[insight] ${analysis.insight}`)
  console.log(`[marketSentiment] ${analysis.marketSentiment}`)

  return { label: sample.label, ok: true, analysis }
}

async function main() {
  const results = []

  for (const sample of samples) {
    try {
      const result = await runSample(sample)
      results.push(result)
    } catch (err) {
      console.error(`\n[FAILED] ${sample.label}: ${err.message}`)
      results.push({ label: sample.label, ok: false, error: err.message })
    }
  }

  console.log(`\n${"=".repeat(70)}`)
  console.log("요약")
  console.log("=".repeat(70))
  const succeeded = results.filter((r) => r.ok)
  console.log(`성공: ${succeeded.length}/${results.length}`)
  results.forEach((r) => console.log(`  - [${r.ok ? "OK" : "FAIL"}] ${r.label}${r.ok ? "" : `: ${r.error}`}`))

  const failed = results.some((r) => !r.ok)
  process.exit(failed ? 1 : 0)
}

main()
