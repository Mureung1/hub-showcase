import { describe, it, expect } from 'vitest'
import {
  applyCookingMethod,
  buildCorrectedIdItem,
  canCorrectCookingMethod,
  COOKING_METHODS,
  detectCookingMethod,
  stripCookingMethod,
} from './foodNameCorrection.js'

describe('detectCookingMethod', () => {
  it('이름 끝의 조리법을 찾는다', () => {
    expect(detectCookingMethod('고등어구이')).toBe('구이')
    expect(detectCookingMethod('돼지갈비찜')).toBe('찜')
    expect(detectCookingMethod('갈비탕')).toBe('탕')
  })

  it('긴 접미사를 먼저 본다 — "볶음"이 "음"으로 읽히면 안 된다', () => {
    expect(detectCookingMethod('제육볶음')).toBe('볶음')
  })

  it('조리법이 없으면 null', () => {
    expect(detectCookingMethod('비빔밥')).toBeNull()
    expect(detectCookingMethod('')).toBeNull()
    expect(detectCookingMethod(null)).toBeNull()
  })

  it('떼면 재료가 안 남는 이름은 조리법으로 보지 않는다', () => {
    expect(detectCookingMethod('구이')).toBeNull()
  })
})

describe('stripCookingMethod', () => {
  it('재료 부분만 남긴다', () => {
    expect(stripCookingMethod('고등어구이')).toBe('고등어')
    expect(stripCookingMethod('돼지갈비찜')).toBe('돼지갈비')
  })

  it('조리법이 없으면 그대로', () => {
    expect(stripCookingMethod('비빔밥')).toBe('비빔밥')
  })
})

describe('applyCookingMethod', () => {
  it('재료는 두고 조리법만 바꾼다', () => {
    expect(applyCookingMethod('고등어구이', '조림')).toBe('고등어조림')
    expect(applyCookingMethod('돼지갈비찜', '구이')).toBe('돼지갈비구이')
  })

  it('조리법이 없던 이름에는 붙인다', () => {
    expect(applyCookingMethod('고등어', '구이')).toBe('고등어구이')
  })

  it('같은 조리법을 다시 고르면 null — 재조회할 이유가 없다', () => {
    expect(applyCookingMethod('고등어구이', '구이')).toBeNull()
  })

  it('선택지에 없는 조리법이나 빈 이름은 null', () => {
    expect(applyCookingMethod('고등어구이', '절임')).toBeNull()
    expect(applyCookingMethod('', '구이')).toBeNull()
  })

  it('화면 선택지는 전부 적용 가능하다', () => {
    for (const { key } of COOKING_METHODS) {
      expect(applyCookingMethod('고등어', key)).toBe(`고등어${key}`)
    }
  })
})

// 리뷰에서 발견한 회귀: '국'과 '탕'이 한 칩("국·탕")으로 묶여 있으면 '탕' 요리는 칩이 활성화되지
// 않고, 눌러도 '국'만 만들어 존재하지 않는 검색어("삼계국")로 재조회됐다.
describe('국/탕 분리(회귀 방지)', () => {
  it('국과 탕이 별개 선택지다', () => {
    expect(COOKING_METHODS.some((m) => m.key === '국')).toBe(true)
    expect(COOKING_METHODS.some((m) => m.key === '탕')).toBe(true)
  })

  it('탕 요리는 탕 접미사를 그대로 유지한다(같은 조리법 재선택은 null)', () => {
    expect(detectCookingMethod('삼계탕')).toBe('탕')
    expect(applyCookingMethod('삼계탕', '탕')).toBeNull()
  })

  it('국 요리를 탕으로, 탕 요리를 국으로 정확히 바꾼다', () => {
    expect(applyCookingMethod('갈비탕', '국')).toBe('갈비국')
    expect(applyCookingMethod('된장국', '탕')).toBe('된장탕')
  })
})

describe('canCorrectCookingMethod', () => {
  it('재료가 남는 이름만 보정을 제공한다', () => {
    expect(canCorrectCookingMethod('고등어구이')).toBe(true)
    expect(canCorrectCookingMethod('비빔밥')).toBe(true)
    expect(canCorrectCookingMethod('국')).toBe(false)
  })
})

// 이름 필드 네 개가 **함께** 움직이는지 잠근다. 이 파일 주석에 적힌 대로, 여기서 두 번 연달아
// 어긋났다 — ①displayName만 안 바뀜(수치는 조림, 이름은 구이) → 고치자 ②nameCandidates가 남음
// (이름은 조림, 수치는 구이). 어느 쪽이든 사용자가 고쳤다고 믿는 값과 저장되는 값이 달라진다.
describe('buildCorrectedIdItem — 이름 필드 4개가 함께 움직인다', () => {
  const idItem = {
    nameCandidates: ['고등어구이', '고등어'],
    dbSearchName: '고등어구이',
    fallbackSearchName: '생선구이',
    displayName: '고등어구이',
    estimatedGrams: 120,
    role: 'main',
  }

  it('네 이름 필드가 전부 새 조리법으로 바뀐다', () => {
    const next = buildCorrectedIdItem(idItem, '조림')
    expect(next.dbSearchName).toBe('고등어조림')
    expect(next.displayName).toBe('고등어조림')
    expect(next.fallbackSearchName).toBe('고등어조림')
    // 낡은 후보가 하나라도 남으면 서버가 그걸 먼저 매칭해 보정이 통째로 무효가 된다.
    expect(next.nameCandidates).toEqual(['고등어조림'])
    expect(next.nameCandidates).not.toContain('고등어구이')
  })

  it('이름 외 필드(맥락·역할·추정치)는 그대로 재사용한다 — Gemini를 다시 부르지 않는다', () => {
    const next = buildCorrectedIdItem(idItem, '조림')
    expect(next.estimatedGrams).toBe(120)
    expect(next.role).toBe('main')
  })

  it('브랜드 표기는 음식명 부분만 바꾸고 괄호는 보존한다', () => {
    const next = buildCorrectedIdItem({ ...idItem, displayName: '고등어구이 (한솥)' }, '조림')
    expect(next.displayName).toBe('고등어조림 (한솥)')
  })

  it('같은 조리법을 다시 고르면 null — 재조회할 이유가 없다', () => {
    expect(buildCorrectedIdItem(idItem, '구이')).toBeNull()
  })
})
