import { describe, expect, it } from 'vitest'
import { searchIngredients } from './ingredientSearch'

const options = [
  { id: 'tofu-regular', label: '두부', matchNames: ['두부'], group: '두부' },
  { id: 'tofu-soft', label: '순두부', matchNames: ['순두부'], group: '두부' },
  { id: 'green-onion', label: '대파', matchNames: ['대파'], group: undefined },
  { id: 'garlic', label: '마늘', matchNames: ['마늘', '다진마늘'] },
  { id: 'no-match-names', label: '기타재료', matchNames: [] },
]

describe('searchIngredients — 정상 케이스', () => {
  it('label에 검색어가 부분일치하면 결과에 포함한다', () => {
    expect(searchIngredients('대파', options).map((o) => o.id)).toEqual(['green-onion'])
  })

  it('label과 다르지만 matchNames에 부분일치하면 결과에 포함한다', () => {
    expect(searchIngredients('다진마늘', options).map((o) => o.id)).toEqual(['garlic'])
  })

  it('group에 부분일치하면 같은 그룹의 다른 label을 가진 옵션도 포함한다', () => {
    const result = searchIngredients('두부', options).map((o) => o.id)
    expect(result).toEqual(['tofu-regular', 'tofu-soft'])
  })

  it('여러 옵션이 동시에 매칭되면 전부 결과에 포함한다', () => {
    expect(searchIngredients('두부', options)).toHaveLength(2)
  })

  it('검색어 앞뒤 공백은 무시하고 매칭한다', () => {
    expect(searchIngredients('  대파  ', options).map((o) => o.id)).toEqual(['green-onion'])
  })

  it('대소문자를 구분하지 않고 매칭한다', () => {
    const withEnglish = [{ id: 'spam', label: 'SPAM', matchNames: ['SPAM'] }]
    expect(searchIngredients('spam', withEnglish)).toHaveLength(1)
  })
})

describe('searchIngredients — 빈 값', () => {
  it('query가 빈 문자열이면 빈 배열을 반환한다', () => {
    expect(searchIngredients('', options)).toEqual([])
  })

  it('query가 공백 문자로만 이루어져 있으면 빈 배열을 반환한다', () => {
    expect(searchIngredients('   ', options)).toEqual([])
  })

  it('options가 빈 배열이면 결과도 빈 배열이다', () => {
    expect(searchIngredients('두부', [])).toEqual([])
  })
})

describe('searchIngredients — 경계값', () => {
  it('검색어가 label과 완전히 동일해도 매칭된다', () => {
    expect(searchIngredients('대파', options).map((o) => o.id)).toEqual(['green-onion'])
  })

  it('검색어가 한 글자뿐이어도 부분일치로 매칭된다', () => {
    expect(searchIngredients('두', options).map((o) => o.id)).toEqual(['tofu-regular', 'tofu-soft'])
  })

  it('group이 없는(undefined) 옵션이 섞여 있어도 에러 없이 동작한다', () => {
    expect(() => searchIngredients('대파', options)).not.toThrow()
  })

  it('matchNames가 빈 배열인 옵션이 섞여 있어도 에러 없이 동작한다', () => {
    expect(() => searchIngredients('기타재료', options)).not.toThrow()
    expect(searchIngredients('기타재료', options).map((o) => o.id)).toEqual(['no-match-names'])
  })
})

describe('searchIngredients — 매칭 안 되는 경우', () => {
  it('어떤 필드에도 부분일치하지 않으면 빈 배열을 반환한다', () => {
    expect(searchIngredients('계란', options)).toEqual([])
  })

  it('options가 undefined여도 에러 없이 빈 배열을 반환한다', () => {
    expect(searchIngredients('두부', undefined)).toEqual([])
  })

  it('options가 null이어도 에러 없이 빈 배열을 반환한다', () => {
    expect(searchIngredients('두부', null)).toEqual([])
  })
})
