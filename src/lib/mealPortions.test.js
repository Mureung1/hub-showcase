// role 분류·중량 배분 고정 테스트. 핵심 보장: 긴 패턴 우선 매칭으로 "김치볶음밥"이 kimchi가 아닌
// rice가 되고, 동길이 패턴 충돌("참치김치찌개")에서도 soup가 이긴다.
import { describe, it, expect } from 'vitest'
import { assignTrayWeights, classifyMenuRole, PORTION_WEIGHTS } from './mealPortions.js'

describe('classifyMenuRole — role별 대표 키워드', () => {
  it('rice: 210g', () => {
    expect(classifyMenuRole('흰쌀밥')).toEqual({ role: 'rice', weight: 210, matched: true })
    expect(classifyMenuRole('제육덮밥')).toEqual({ role: 'rice', weight: 210, matched: true })
  })

  it('noodle: 450g', () => {
    expect(classifyMenuRole('멸치칼국수')).toEqual({ role: 'noodle', weight: 450, matched: true })
    expect(classifyMenuRole('짜장면')).toEqual({ role: 'noodle', weight: 450, matched: true })
  })

  it('soup: 300g', () => {
    expect(classifyMenuRole('된장찌개')).toEqual({ role: 'soup', weight: 300, matched: true })
    expect(classifyMenuRole('미역국')).toEqual({ role: 'soup', weight: 300, matched: true })
  })

  it('main: 120g', () => {
    expect(classifyMenuRole('제육볶음')).toEqual({ role: 'main', weight: 120, matched: true })
    expect(classifyMenuRole('돈까스')).toEqual({ role: 'main', weight: 120, matched: true })
  })

  it('side: 50g', () => {
    expect(classifyMenuRole('시금치나물')).toEqual({ role: 'side', weight: 50, matched: true })
    expect(classifyMenuRole('감자조림')).toEqual({ role: 'side', weight: 50, matched: true })
  })

  it('kimchi: 40g', () => {
    expect(classifyMenuRole('배추김치')).toEqual({ role: 'kimchi', weight: 40, matched: true })
    expect(classifyMenuRole('깍두기')).toEqual({ role: 'kimchi', weight: 40, matched: true })
  })

  it('dessert: 80g', () => {
    expect(classifyMenuRole('요구르트')).toEqual({ role: 'dessert', weight: 80, matched: true })
    expect(classifyMenuRole('빵')).toEqual({ role: 'dessert', weight: 80, matched: true })
  })

  it('drink: 200ml', () => {
    expect(classifyMenuRole('우유')).toEqual({ role: 'drink', weight: 200, matched: true })
    expect(classifyMenuRole('식혜')).toEqual({ role: 'drink', weight: 200, matched: true })
  })
})

describe('classifyMenuRole — 긴 패턴 우선 매칭(우선순위 케이스)', () => {
  it('"김치볶음밥" → kimchi가 아니라 rice(볶음밥 3글자 > 김치 2글자)', () => {
    expect(classifyMenuRole('김치볶음밥').role).toBe('rice')
  })

  it('접미사(그릇 종류)가 실제 역할을 정한다 — 중간에 낀 다른 역할 키워드보다 우선', () => {
    // 코드 리뷰에서 발견: "볶음"(side)·"까스"/"닭갈비"(main) 같은 패턴이 문자열 중간에 있다고
    // 끝의 "밥"/"덮밥"보다 이겨버리면 전부 틀린 role이 된다 — 전부 rice(210g)여야 한다.
    expect(classifyMenuRole('짬뽕밥').role).toBe('rice')
    expect(classifyMenuRole('잡채밥').role).toBe('rice')
    expect(classifyMenuRole('오징어볶음밥').role).toBe('rice')
    expect(classifyMenuRole('닭갈비덮밥').role).toBe('rice')
  })

  it('"참치김치찌개" → kimchi가 아니라 soup(같은 길이 충돌에서도 soup 우선)', () => {
    expect(classifyMenuRole('참치김치찌개').role).toBe('soup')
  })

  it('미매칭 메뉴는 기본값 side 50g', () => {
    expect(classifyMenuRole('알 수 없는 메뉴 XYZ')).toEqual({ role: 'side', weight: 50, matched: false })
    expect(classifyMenuRole('')).toEqual({ role: 'side', weight: 50, matched: false })
  })
})

describe('assignTrayWeights', () => {
  it('rice와 noodle이 동시에 있으면 noodle을 150g으로 감량한다', () => {
    const items = assignTrayWeights(['흰쌀밥', '잔치국수', '배추김치'])
    const noodle = items.find((i) => i.role === 'noodle')
    const rice = items.find((i) => i.role === 'rice')
    expect(noodle.weight).toBe(150)
    expect(rice.weight).toBe(PORTION_WEIGHTS.rice)
  })

  it('noodle만 있으면 표준 중량(450g) 그대로', () => {
    const items = assignTrayWeights(['짜장면', '단무지'])
    expect(items.find((i) => i.role === 'noodle').weight).toBe(450)
  })

  it('각 항목에 name·role·weight를 부여하고 순서를 유지한다', () => {
    const items = assignTrayWeights(['흰쌀밥', '된장찌개', '제육볶음'])
    expect(items).toEqual([
      { name: '흰쌀밥', role: 'rice', weight: 210 },
      { name: '된장찌개', role: 'soup', weight: 300 },
      { name: '제육볶음', role: 'main', weight: 120 },
    ])
  })

  it('빈 목록/빈 문자열 메뉴는 걸러낸다', () => {
    expect(assignTrayWeights([])).toEqual([])
    expect(assignTrayWeights(['흰쌀밥', '', null, undefined])).toHaveLength(1)
  })
})
