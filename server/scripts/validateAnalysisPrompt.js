import "dotenv/config"
import { FALLBACK_ARTICLE } from "../src/services/articleParser.js"
import {
  buildFastAnalysisPrompt,
  buildSlowAnalysisPrompt,
  callClaudeWithMetrics,
  parseFastAnalysisResponse,
  parseSlowAnalysisResponse,
} from "../src/services/llmService.js"

// fast/slow analyze 분리(리더뷰 로딩 지연 개선) 후에도, 두 프롬프트가 실제
// Claude 응답에서 기대한 JSON 형식(문장/excerpt verbatim 매칭, summaryBullets
// 3개, marketSentiment enum)을 안정적으로 만족하는지 여러 샘플 기사로 반복
// 확인할 때 재사용하는 회귀 검증 스크립트. fast/slow 각각의 응답 지연시간
// (TTFT/총 생성시간)과 토큰 사용량을 따로 기록해, 분리가 실제로 체감 지연을
// 줄이는지 수치로 확인할 수 있게 한다.
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
  {
    label: "특수기호 엣지케이스형",
    title: "Central Bank Chief Warns of “Persistent” Price Pressures — Markets Wobble",
    paragraphs: [
      "The central bank governor said Tuesday that inflation remains “stubbornly persistent”—a phrase traders immediately flagged as more hawkish than last month's ‘transitory’ framing—and warned that rates could stay elevated ‘for longer than markets currently expect.’",
      "Equity futures dropped as much as 1.4%  in the minutes following the remarks, before paring losses to close roughly flat—an outcome several strategists attributed to thin holiday-week liquidity rather than genuine conviction either way.",
      "\"We are not done fighting this,\" the governor added, according to a transcript released by the bank—language that echoed, almost word for word, comments made nine months earlier that preceded a sharp — if short-lived — selloff in growth stocks.",
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

async function runFastLane(sample) {
  const prompt = buildFastAnalysisPrompt(sample.paragraphs, sample.title)
  const { response, ttftMs, totalMs } = await callClaudeWithMetrics(prompt, { maxTokens: 2048 })
  const analysis = parseFastAnalysisResponse(response, sample.paragraphs)

  console.log(`\n[FAST LANE] sentences ${analysis.sentences.length}개 (verbatim 매칭 결과)`)
  console.log(formatSentenceCheck(analysis.sentences, sample.paragraphs))

  console.log(`\n[FAST LANE] summaryBullets ${analysis.summaryBullets.length}개 (기대: 3) ${analysis.summaryBullets.length === 3 ? "OK" : "MISMATCH"}`)
  analysis.summaryBullets.forEach((b, i) => console.log(`    ${i + 1}. ${b}`))

  console.log(`\n[FAST LANE latency] TTFT: ${ttftMs}ms / 총 생성시간: ${totalMs}ms`)
  console.log(`[FAST LANE tokens] 입력: ${response.usage.input_tokens} / 출력: ${response.usage.output_tokens}`)

  return { analysis, ttftMs, totalMs, usage: response.usage }
}

async function runSlowLane(sample) {
  const prompt = buildSlowAnalysisPrompt(sample.paragraphs, sample.title)
  const { response, ttftMs, totalMs } = await callClaudeWithMetrics(prompt, { maxTokens: 2048 })
  const analysis = parseSlowAnalysisResponse(response, sample.paragraphs)

  console.log(`\n[SLOW LANE] terms ${analysis.terms.length}개`)
  analysis.terms.forEach((t) => console.log(`    - ${t.term}: ${t.definition}`))

  console.log(`\n[SLOW LANE] insight: ${analysis.insight}`)
  console.log(`[SLOW LANE] marketSentiment: ${analysis.marketSentiment}`)

  console.log(`\n[SLOW LANE latency] TTFT: ${ttftMs}ms / 총 생성시간: ${totalMs}ms`)
  console.log(`[SLOW LANE tokens] 입력: ${response.usage.input_tokens} / 출력: ${response.usage.output_tokens}`)

  return { analysis, ttftMs, totalMs, usage: response.usage }
}

async function runSample(sample) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`샘플: ${sample.label}`)
  console.log(`제목: ${sample.title}`)
  console.log("=".repeat(70))

  const fast = await runFastLane(sample)
  const slow = await runSlowLane(sample)

  return { label: sample.label, ok: true, fast, slow }
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
  results.forEach((r) => {
    if (!r.ok) {
      console.log(`  - [FAIL] ${r.label}: ${r.error}`)
      return
    }
    console.log(
      `  - [OK] ${r.label} | fast TTFT ${r.fast.ttftMs}ms/총 ${r.fast.totalMs}ms ` +
        `(입력 ${r.fast.usage.input_tokens}tok/출력 ${r.fast.usage.output_tokens}tok) | ` +
        `slow TTFT ${r.slow.ttftMs}ms/총 ${r.slow.totalMs}ms ` +
        `(입력 ${r.slow.usage.input_tokens}tok/출력 ${r.slow.usage.output_tokens}tok)`,
    )
  })

  const failed = results.some((r) => !r.ok)
  process.exit(failed ? 1 : 0)
}

main()
