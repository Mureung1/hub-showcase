import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VOCABULARY_PATH = path.join(__dirname, "../../data/vocabulary.json")

// decisionStore.js와 동일하게 fs.readFileSync/writeFileSync로 동기 처리한다 —
// 기사 분석 시 여러 용어가 짧은 간격으로 연속 저장될 수 있어, 비동기로 처리하면
// 읽기-수정-쓰기가 겹쳐 파일이 깨질 위험이 있다.
function readRawVocabulary() {
  const raw = readFileSync(VOCABULARY_PATH, "utf-8")
  return JSON.parse(raw)
}

export function readVocabulary() {
  return readRawVocabulary().sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
}

export function appendVocabulary(term, definition, articleTitle, articleUrl) {
  const vocabulary = readRawVocabulary()

  // 같은 기사가 재분석되며 이미 저장된 용어가 다시 들어올 수 있어 중복 추가하지 않는다.
  const alreadyExists = vocabulary.some((v) => v.term.toLowerCase() === term.toLowerCase())
  if (alreadyExists) return null

  const saved = {
    term,
    definition,
    articleTitle,
    articleUrl,
    addedAt: new Date().toISOString(),
  }

  vocabulary.push(saved)
  writeFileSync(VOCABULARY_PATH, JSON.stringify(vocabulary, null, 2))
  return saved
}
