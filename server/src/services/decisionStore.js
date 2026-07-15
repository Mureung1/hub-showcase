import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DECISIONS_PATH = path.join(__dirname, "../../data/decisions.json")

// fs.readFileSync/writeFileSync로 동기 처리한다 — 비동기로 처리하면 매수/
// 관망/매도 버튼을 연속 클릭했을 때 두 요청의 읽기-수정-쓰기가 겹쳐 파일이
// 깨질 수 있다. MVP 규모의 단일 JSON 파일에는 동기 처리가 더 안전하다.
export function readDecisions() {
  const raw = readFileSync(DECISIONS_PATH, "utf-8")
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw)
}

export function appendDecision({ url, title, summaryBullets, decision, marketSentiment, insight }) {
  const decisions = readDecisions()
  const saved = {
    id: `${Date.now()}`,
    url,
    title,
    summaryBullets,
    decision,
    marketSentiment: marketSentiment ?? null,
    insight: insight ?? null,
    createdAt: new Date().toISOString(),
  }

  decisions.unshift(saved)
  writeFileSync(DECISIONS_PATH, JSON.stringify(decisions, null, 2))
  return saved
}
