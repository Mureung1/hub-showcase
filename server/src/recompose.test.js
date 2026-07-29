import { describe, expect, test } from 'vitest'
import recomposeModule from './recompose.js'
import cases from './__fixtures__/recompose-cases.json' with { type: 'json' }

const { recompose, heldConcepts } = recomposeModule

// ---- 파이썬 기준 대조 -----------------------------------------------------
// fixture 는 파이썬 `agent/src/careersignal/agents/roadmap/recompose.py` 의 결과다.
// 두 구현이 갈라지면 같은 체크에 다른 순서가 나오므로 전량을 정확히 대조한다.

describe('recompose 는 파이썬 기준 구현과 같은 결과를 낸다', () => {
  test('fixture 가 비어 있지 않다', () => {
    expect(cases.cases.length).toBeGreaterThan(0)
  })

  for (const item of cases.cases) {
    test(item.name, () => {
      expect(recompose(item.payload, item.checks)).toEqual(item.expected)
    })
  }
})

// ---- 순수 함수 성질 -------------------------------------------------------

describe('recompose 는 순수 함수다', () => {
  test('입력 payload 를 고치지 않는다', () => {
    const item = cases.cases.find((entry) => Object.keys(entry.checks).length > 0)
    const before = JSON.stringify(item.payload)
    recompose(item.payload, item.checks)
    expect(JSON.stringify(item.payload)).toBe(before)
  })

  test('같은 입력에 같은 결과를 낸다', () => {
    const item = cases.cases[1]
    expect(recompose(item.payload, item.checks)).toEqual(recompose(item.payload, item.checks))
  })
})

describe('heldConcepts', () => {
  test('값이 참인 키만 보유로 읽는다', () => {
    expect([...heldConcepts({ a: true, b: false, c: true })].sort()).toEqual(['a', 'c'])
  })

  test('체크가 없으면 비어 있다', () => {
    expect(heldConcepts({}).size).toBe(0)
    expect(heldConcepts(undefined).size).toBe(0)
  })
})
