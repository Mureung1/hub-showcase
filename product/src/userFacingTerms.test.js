import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const files = [
  './data/preview.js',
  './screens/ReverseScreen.jsx',
  './screens/StatsScreen.jsx',
  './components/PostingAnalyzePanel.jsx',
]

const forbiddenPhrases = [
  '직무 기준선',
  '전체 baseline',
  '(baseline)',
  'baseline 위',
  'baseline보다',
  'baseline에',
  'BASELINE',
  '직무 baseline',
  '통계 items',
  '실데이터',
  '3차(LLM)',
  '문장 추출(3차)',
]

test('사용자 화면에 내부 분석 용어를 노출하지 않는다', () => {
  for (const file of files) {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8')
    for (const phrase of forbiddenPhrases) {
      assert.equal(content.includes(phrase), false, `${file}: ${phrase}`)
    }
  }
})
