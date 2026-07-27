import { describe, expect, it } from 'vitest'
import { groupRecipesByMissingIngredients } from './selectors'

function makeRecipe(overrides) {
  return {
    id: 'test-recipe',
    name: '테스트 레시피',
    totalCost: 1000,
    ingredients: [],
    ...overrides,
  }
}

describe('groupRecipesByMissingIngredients — 정상 케이스', () => {
  it('부족 재료가 0개면 ready에 원본 그대로 들어간다 (missingCount 없음)', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '계란' }, { name: '밥' }] })
    const { ready, shopping, others } = groupRecipesByMissingIngredients([recipe], ['계란', '밥'], [])
    expect(ready).toEqual([recipe])
    expect(ready[0].missingCount).toBeUndefined()
    expect(shopping).toEqual([])
    expect(others).toEqual([])
  })

  it('부족 재료가 1개면 shopping에 missingCount: 1로 들어간다', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '계란' }, { name: '밥' }] })
    const { shopping } = groupRecipesByMissingIngredients([recipe], ['밥'], [])
    expect(shopping).toHaveLength(1)
    expect(shopping[0].missingCount).toBe(1)
  })

  it('부족 재료가 2개면 shopping에 missingCount: 2로 들어간다', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '계란' }, { name: '밥' }, { name: '대파' }] })
    const { shopping } = groupRecipesByMissingIngredients([recipe], ['대파'], [])
    expect(shopping).toHaveLength(1)
    expect(shopping[0].missingCount).toBe(2)
  })

  it('부족 재료가 3개 이상이면 others에 missingCount가 붙어 들어간다', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '계란' }, { name: '밥' }, { name: '대파' }, { name: '김치' }] })
    const { others } = groupRecipesByMissingIngredients([recipe], [], [])
    expect(others).toHaveLength(1)
    expect(others[0].missingCount).toBe(4)
  })

  it('조미료로 등록된 재료는 보유 여부와 상관없이 부족 개수에서 제외된다', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '계란' }, { name: '소금' }, { name: '후추' }] })
    const { shopping } = groupRecipesByMissingIngredients([recipe], [], ['소금', '후추'])
    expect(shopping).toHaveLength(1)
    expect(shopping[0].missingCount).toBe(1)
  })

  it('여러 레시피가 섞여 있으면 각 그룹 안에서 가격 오름차순으로 정렬된다', () => {
    const cheap = makeRecipe({ id: 'cheap', totalCost: 1000, ingredients: [{ name: '대파' }] })
    const expensive = makeRecipe({ id: 'expensive', totalCost: 5000, ingredients: [{ name: '마늘' }] })
    const { shopping } = groupRecipesByMissingIngredients([expensive, cheap], [], [])
    expect(shopping.map((r) => r.id)).toEqual(['cheap', 'expensive'])
  })
})

describe('groupRecipesByMissingIngredients — 경계값', () => {
  it('부족 재료가 정확히 2개면 shopping이다 (3개로 넘어가기 직전 경계)', () => {
    const recipe = makeRecipe({ ingredients: [{ name: 'a' }, { name: 'b' }] })
    const { shopping, others } = groupRecipesByMissingIngredients([recipe], [], [])
    expect(shopping).toHaveLength(1)
    expect(others).toHaveLength(0)
  })

  it('부족 재료가 정확히 3개면 others다 (경계를 넘는 순간)', () => {
    const recipe = makeRecipe({ ingredients: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] })
    const { shopping, others } = groupRecipesByMissingIngredients([recipe], [], [])
    expect(shopping).toHaveLength(0)
    expect(others).toHaveLength(1)
  })

  it('ingredients가 빈 배열이면 부족 0개로 계산돼 ready로 분류된다', () => {
    const recipe = makeRecipe({ ingredients: [] })
    const { ready } = groupRecipesByMissingIngredients([recipe], [], [])
    expect(ready).toHaveLength(1)
  })
})

describe('groupRecipesByMissingIngredients — 빈 값', () => {
  it('recipes가 빈 배열이면 세 그룹 다 빈 배열을 반환한다', () => {
    expect(groupRecipesByMissingIngredients([], [], [])).toEqual({ ready: [], shopping: [], others: [] })
  })

  it('ownedNames가 빈 배열이면 조미료 아닌 재료는 전부 부족으로 계산된다', () => {
    const recipe = makeRecipe({
      ingredients: [{ name: '계란' }, { name: '밥' }, { name: '대파' }, { name: '김치' }],
    })
    const { others } = groupRecipesByMissingIngredients([recipe], [], [])
    expect(others[0].missingCount).toBe(4)
  })

  it('seasoningNames가 빈 배열이면 제외 없이 전부 부족 계산에 포함된다', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '소금' }] })
    const { shopping } = groupRecipesByMissingIngredients([recipe], [], [])
    expect(shopping[0].missingCount).toBe(1)
  })
})

describe('groupRecipesByMissingIngredients — 매칭 안 되는 경우', () => {
  it('ownedNames에 레시피에 없는 재료명이 섞여 있어도 에러 없이 무시된다', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '계란' }] })
    expect(() => groupRecipesByMissingIngredients([recipe], ['존재안함', '계란'], [])).not.toThrow()
    const { ready } = groupRecipesByMissingIngredients([recipe], ['존재안함', '계란'], [])
    expect(ready).toHaveLength(1)
  })

  it('원본 recipes 배열과 레시피 객체를 변형하지 않는다', () => {
    const recipe = makeRecipe({ ingredients: [{ name: '계란' }] })
    const recipes = [recipe]
    groupRecipesByMissingIngredients(recipes, [], [])
    expect(recipes).toEqual([recipe])
    expect(recipe.missingCount).toBeUndefined()
  })
})

describe('groupRecipesByMissingIngredients — shopping 정렬(부족개수 우선, 그 안에서 가격순)', () => {
  it('부족 개수가 적으면 더 비싸도 먼저 온다', () => {
    const twoMissingCheap = makeRecipe({ id: 'A', totalCost: 3000, ingredients: [{ name: 'a1' }, { name: 'a2' }] })
    const oneMissingExpensive = makeRecipe({ id: 'B', totalCost: 5000, ingredients: [{ name: 'b1' }] })
    const { shopping } = groupRecipesByMissingIngredients([twoMissingCheap, oneMissingExpensive], [], [])
    expect(shopping.map((r) => r.id)).toEqual(['B', 'A'])
  })

  it('부족 개수가 같으면 그 안에서 가격 오름차순이다', () => {
    const expensive = makeRecipe({ id: 'A', totalCost: 3000, ingredients: [{ name: 'a1' }] })
    const cheap = makeRecipe({ id: 'B', totalCost: 1000, ingredients: [{ name: 'b1' }] })
    const { shopping } = groupRecipesByMissingIngredients([expensive, cheap], [], [])
    expect(shopping.map((r) => r.id)).toEqual(['B', 'A'])
  })

  it('부족 개수 다른 여러 레시피가 섞이면 부족개수 우선, 그 안에서 가격순으로 정렬된다', () => {
    const twoMissing = makeRecipe({ id: 'A', totalCost: 2000, ingredients: [{ name: 'a1' }, { name: 'a2' }] })
    const oneMissingExpensive = makeRecipe({ id: 'B', totalCost: 5000, ingredients: [{ name: 'b1' }] })
    const oneMissingCheap = makeRecipe({ id: 'C', totalCost: 1000, ingredients: [{ name: 'c1' }] })
    const { shopping } = groupRecipesByMissingIngredients([twoMissing, oneMissingExpensive, oneMissingCheap], [], [])
    expect(shopping.map((r) => r.id)).toEqual(['C', 'B', 'A'])
  })

  it('others는 이 변경과 무관하게 계속 가격순으로만 정렬된다 (회귀 방지)', () => {
    const fiveMissingCheap = makeRecipe({
      id: 'A',
      totalCost: 1000,
      ingredients: [{ name: 'a1' }, { name: 'a2' }, { name: 'a3' }, { name: 'a4' }, { name: 'a5' }],
    })
    const threeMissingExpensive = makeRecipe({
      id: 'B',
      totalCost: 5000,
      ingredients: [{ name: 'b1' }, { name: 'b2' }, { name: 'b3' }],
    })
    const { others } = groupRecipesByMissingIngredients([threeMissingExpensive, fiveMissingCheap], [], [])
    expect(others.map((r) => r.id)).toEqual(['A', 'B'])
  })
})
