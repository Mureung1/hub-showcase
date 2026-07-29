// `data/recompose.js` 가 서버 구현과 같은 결과를 내는지 대조한다.
//
// 대조 자료는 `server/src/__fixtures__/recompose-cases.json` 이다. 이 파일은 파이썬
// `agent/src/careersignal/agents/roadmap/recompose.py` 의 결과를 그대로 담고 있고,
// `server/src/recompose.test.js` 도 같은 파일을 쓴다. 세 구현이 하나의 기준을 본다.
//
// 실행: product 폴더에서 `npm test`. 테스트 러너는 Node 에 들어 있는 `node --test` 라
// 새 의존성을 넣지 않는다. fixture 는 읽기만 하며 product 안으로 복사하지 않는다 —
// 복사본을 두면 서버가 규칙을 고쳐도 이 검사가 옛 값을 계속 통과시킨다.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { heldConcepts, recompose } from './recompose.js'

const FIXTURE_URL = new URL('../../../server/src/__fixtures__/recompose-cases.json', import.meta.url)
const fixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'))
const cases = fixture.cases

test('fixture 가 비어 있지 않다', () => {
  assert.ok(cases.length > 0)
})

// ---- 서버 기준 대조 -------------------------------------------------------

for (const item of cases) {
  test(`같은 입력에 같은 출력 · ${item.name}`, () => {
    assert.deepStrictEqual(recompose(item.payload, item.checks), item.expected)
  })
}

// ---- 순수 함수 성질 -------------------------------------------------------

test('입력 payload 를 고치지 않는다', () => {
  const item = cases.find((entry) => Object.keys(entry.checks).length > 0)
  const before = JSON.stringify(item.payload)
  recompose(item.payload, item.checks)
  assert.equal(JSON.stringify(item.payload), before)
})

test('같은 입력을 두 번 넣으면 같은 결과가 나온다', () => {
  const item = cases[1]
  assert.deepStrictEqual(recompose(item.payload, item.checks), recompose(item.payload, item.checks))
})

test('heldConcepts 는 값이 참인 키만 보유로 읽는다', () => {
  assert.deepStrictEqual([...heldConcepts({ a: true, b: false, c: true })].sort(), ['a', 'c'])
  assert.equal(heldConcepts({}).size, 0)
  assert.equal(heldConcepts(undefined).size, 0)
})
