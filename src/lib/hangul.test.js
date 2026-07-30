import { describe, it, expect } from 'vitest'
import { jamoBigrams, jamoSimilarity, toJamo } from './hangul.js'

describe('toJamo', () => {
  it('초·중·종성으로 편다', () => {
    expect(toJamo('밥')).toBe('ㅂㅏㅂ')
    expect(toJamo('국')).toBe('ㄱㅜㄱ')
    expect(toJamo('가')).toBe('ㄱㅏ') // 받침 없음
  })

  it('겹받침을 자음 둘로 푼다 — 이게 없으면 닭↔닥이 무관한 글자가 된다', () => {
    expect(toJamo('닭')).toBe('ㄷㅏㄹㄱ')
    expect(toJamo('삶')).toBe('ㅅㅏㄹㅁ')
  })

  it('한글이 아닌 문자는 그대로 둔다 — "LA갈비"·"6쪽마늘" 같은 이름이 실제로 있다', () => {
    expect(toJamo('LA갈비')).toBe('LAㄱㅏㄹㅂㅣ')
    expect(toJamo('')).toBe('')
    expect(toJamo(null)).toBe('')
  })
})

describe('jamoSimilarity', () => {
  it('같으면 1', () => {
    expect(jamoSimilarity('김치찌개', '김치찌개')).toBe(1)
  })

  it('받침 하나 차이는 음절 단위보다 훨씬 가깝게 본다', () => {
    // 닭갈비(ㄷㅏㄹㄱㄱㅏㄹㅂㅣ, 9) vs 닥갈비(ㄷㅏㄱㄱㅏㄹㅂㅣ, 8) — 자모 1개 차이
    expect(jamoSimilarity('닭갈비', '닥갈비')).toBeGreaterThan(0.85)
  })

  it('오탈자 한 글자는 높은 유사도로 남는다', () => {
    expect(jamoSimilarity('돼지김치찌개', '돼지깁치찌개')).toBeGreaterThan(0.9)
  })

  it('무관한 이름은 낮다', () => {
    expect(jamoSimilarity('계란국', '계란빵')).toBeLessThan(0.8)
    expect(jamoSimilarity('라면', '샐러드')).toBeLessThan(0.4)
  })

  it('빈 입력은 0', () => {
    expect(jamoSimilarity('', '김치')).toBe(0)
  })
})

describe('jamoBigrams', () => {
  it('연속한 자모 쌍을 만든다', () => {
    expect(jamoBigrams('밥')).toEqual(['ㅂㅏ', 'ㅏㅂ'])
  })

  it('가운데 재료가 끼어든 이름도 꼬리 bigram을 공유한다 — 역색인 recall의 근거', () => {
    const a = new Set(jamoBigrams('꽁치김치조림'))
    const shared = jamoBigrams('꽁치조림').filter((g) => a.has(g))
    expect(shared.length).toBeGreaterThan(4)
  })

  it('한 글자보다 짧으면 빈 배열', () => {
    expect(jamoBigrams('')).toEqual([])
  })
})
