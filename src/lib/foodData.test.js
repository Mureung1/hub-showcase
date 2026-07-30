// foodData.js 통합 테이블의 "값 보존" 고정 테스트.
// 통합 전 세 테이블(PORTION_REFERENCE_G / NUTRIENT_PLAUSIBILITY / CANONICAL_MAP)이 내던 값과
// 동일한지 대표 케이스로 확인한다 — 통합은 위치만 옮기는 작업이고 값이 바뀌면 회귀다.
import { describe, it, expect } from 'vitest'
import { getCanonicalName, getPlausibility, getPortionRange } from './foodData.js'
import { clampEstimatedGrams, clampToPlausibleNutrients, clampToStandardPlausibleNutrients } from './nutrition.js'

describe('getPortionRange — 기존 PORTION_REFERENCE_G 값 보존', () => {
  it.each([
    ['짜장면', 450, 900],
    ['자장면', 450, 900],
    ['짬뽕', 500, 950],
    ['신라면', 350, 700], // '라면' 부분일치
    ['돌솥비빔밥', 350, 700], // '비빔밥' 부분일치
    ['참치김치찌개', 250, 600], // '찌개' 부분일치
    ['탕수육', 150, 500], // '탕' 일반 항목이 아니라 탕수육 전용 범위여야 한다 (순서 규칙)
    ['감자탕', 400, 950],
    ['설렁탕', 300, 800], // 전용 portion이 없어 '탕' 일반 범위로 폴스루 (기존과 동일)
    ['칼국수', 380, 850], // canonical만 있는 얇은 항목 → '국수' 항목으로 폴스루 (기존과 동일)
    ['공기밥', 150, 300],
    ['제육볶음', 150, 500],
    ['불고기', 150, 500],
    ['해물파전', 120, 500], // '파전'은 부침개 항목 keywords에 포함
    ['양념치킨', 100, 900],
  ])('%s → [%d, %d]', (name, min, max) => {
    expect(getPortionRange(name)).toEqual({ min, max })
  })

  it('테이블에 없는 음식은 null (호출부가 범용 범위로 폴백)', () => {
    expect(getPortionRange('정체불명음식')).toBeNull()
    expect(getPortionRange('')).toBeNull()
    expect(getPortionRange(null)).toBeNull()
  })
})

describe('getPlausibility — 기존 NUTRIENT_PLAUSIBILITY 값 보존', () => {
  it('짜장면: 검증된 좁은 범위 그대로 (referenceGrams 650)', () => {
    const entry = getPlausibility('짜장면')
    expect(entry.referenceGrams).toBe(650)
    expect(entry.ranges.protein).toEqual([12, 16])
    expect(entry.ranges.carbs).toEqual([110, 130])
    expect(entry.ranges.calories).toEqual([650, 800])
    expect(entry.ranges.sodium).toEqual([1200, 1800])
  })

  it('참치김치찌개: 찌개 공통 범위로 폴스루 (열량은 의도적으로 없음)', () => {
    const entry = getPlausibility('참치김치찌개')
    expect(entry.referenceGrams).toBe(400)
    expect(entry.ranges.protein).toEqual([12, 18])
    expect(entry.ranges.sodium).toEqual([1500, 2000])
    expect(entry.ranges.calories).toBeUndefined()
  })

  it('탕수육: 감자탕/탕 일반이 아니라 탕수육 전용 범위 (순서 규칙)', () => {
    expect(getPlausibility('탕수육').referenceGrams).toBe(250)
  })

  it('칼국수: 국수 공통 범위로 폴스루', () => {
    expect(getPlausibility('칼국수').referenceGrams).toBe(550)
  })

  it('갈비탕·설렁탕·미역국: 통합 전 이가 갈렸던 항목 — 이제 보정 범위가 있다', () => {
    for (const name of ['갈비탕', '설렁탕', '미역국']) {
      const entry = getPlausibility(name)
      expect(entry).not.toBeNull()
      expect(entry.ranges.protein).toBeDefined()
    }
  })

  it('범위가 없는 음식은 null (보정 생략)', () => {
    expect(getPlausibility('정체불명음식')).toBeNull()
  })
})

describe('getCanonicalName — 기존 CANONICAL_MAP 매핑 보존', () => {
  it.each([
    ['돌솥비빔밥', '비빔밥'],
    ['전주비빔밥', '비빔밥'],
    ['김치볶음밥', null], // 이미 표준명과 같으면 null (중복 검색 방지)
    ['새우볶음밥', '볶음밥'],
    ['돼지국밥', '국밥'],
    ['카레', '카레라이스'],
    ['신라면', '라면'],
    ['물냉면', '냉면'],
    ['참치김치찌개', '김치찌개'],
    ['순두부찌개', '순두부찌개'], // 자기 자신 → null이 아님? 표준명과 같으므로 null
    ['죠스떡볶이 매운맛', '떡볶이'],
    ['참치김밥', '김밥'],
    ['양념치킨', '치킨'],
    ['옛날통닭', '치킨'],
    ['후라이드', '치킨'],
    ['왕만두', '만두'],
    ['해물파전', '파전'],
    ['제육덮밥', '제육볶음'],
    ['갈비탕', null], // 이미 표준명
    ['설렁탕', null],
    ['미역국', null],
    ['라면', null],
    ['알수없는음식', null],
  ])('%s → %s', (name, expected) => {
    if (name === '순두부찌개') {
      // 순두부찌개는 canonical('순두부찌개')과 이름이 같아 null이어야 한다
      expect(getCanonicalName(name)).toBeNull()
      return
    }
    expect(getCanonicalName(name)).toBe(expected)
  })
})

describe('머리명사 규칙 — 교차 그룹 복합명은 마지막 명사가 이긴다', () => {
  // 통합 전 세 테이블은 그룹 배치 순서가 서로 달라 이런 이름들에서 서로 다른 답을 내는 모순이
  // 있었다(예: 치킨김밥 — portion은 치킨, canonical은 김밥). 머리명사(마지막 명사) 규칙으로 통일.
  it('카레우동은 우동이다 (카레가 아니라)', () => {
    expect(getPortionRange('카레우동')).toEqual({ min: 400, max: 850 })
    expect(getCanonicalName('카레우동')).toBe('우동')
    expect(getPlausibility('카레우동').referenceGrams).toBe(600)
  })

  it('치킨김밥은 김밥이다 (치킨이 아니라)', () => {
    expect(getPortionRange('치킨김밥')).toEqual({ min: 150, max: 500 })
    expect(getCanonicalName('치킨김밥')).toBe('김밥')
  })

  it('만두국은 국이다 — 만두 1인분(100~400g)이 아니라 국물 요리 범위', () => {
    expect(getPortionRange('만두국')).toEqual({ min: 300, max: 800 })
  })

  it('끝 위치가 같으면 더 긴(구체적인) 키워드가 이긴다 — 탕수육 ≠ 탕, 김치볶음밥 ≠ 볶음밥', () => {
    expect(getPortionRange('탕수육')).toEqual({ min: 150, max: 500 })
    expect(getCanonicalName('김치볶음밥')).toBeNull() // 자기 자신이 표준명
  })
})

describe('nutrition.js 경유 end-to-end (기존 동작 보존)', () => {
  it('clampEstimatedGrams: 짜장면 2000g → 900g(상한), 0g → 675g(중앙값), 미등록 음식 0g → 100g', () => {
    expect(clampEstimatedGrams(2000, '짜장면')).toBe(900)
    expect(clampEstimatedGrams(0, '짜장면')).toBe(675)
    expect(clampEstimatedGrams(0, '정체불명음식')).toBe(100)
    expect(clampEstimatedGrams(3000, '정체불명음식')).toBe(1500) // 범용 상한
  })

  it('clampToPlausibleNutrients: 짜장면 650g 단백질 28g → 상한(16g)으로 보정, 20g은 1.5배 여유 내라 유지', () => {
    const clamped = clampToPlausibleNutrients({ protein: 28 }, '짜장면', 650)
    expect(clamped.protein).toBe(16)
    const kept = clampToPlausibleNutrients({ protein: 20 }, '짜장면', 650)
    expect(kept.protein).toBe(20)
  })

  it('clampToPlausibleNutrients: grams에 비례해 범위가 스케일된다 (325g이면 절반)', () => {
    const clamped = clampToPlausibleNutrients({ protein: 28 }, '짜장면', 325)
    expect(clamped.protein).toBe(8) // 16 * 0.5
  })

  it('clampToStandardPlausibleNutrients: 표준 1인분 기준(scale=1)으로 보정', () => {
    const clamped = clampToStandardPlausibleNutrients({ protein: 28, carbs: 120 }, '짜장면')
    expect(clamped.protein).toBe(16)
    expect(clamped.carbs).toBe(120) // 범위 내 유지
  })

  it('범위 없는 음식은 원본 그대로', () => {
    const src = { protein: 999 }
    expect(clampToPlausibleNutrients(src, '정체불명음식', 300)).toBe(src)
  })
})
