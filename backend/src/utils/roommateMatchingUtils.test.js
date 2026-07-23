import { describe, it, expect } from 'vitest'
import { passesHobbyFilter } from './roommateMatchingUtils.js'

describe('passesHobbyFilter', () => {
  it('주성향끼리 같으면 true를 반환한다', () => {
    expect(
      passesHobbyFilter({ primary: '딥다이버', secondary: '무드트래블러' }, { primary: '딥다이버', secondary: '소셜메이커' })
    ).toBe(true)
  })

  it('요청자 보조성향이 후보 주성향과 같으면 true를 반환한다', () => {
    expect(
      passesHobbyFilter({ primary: '무드트래블러', secondary: '딥다이버' }, { primary: '딥다이버', secondary: '소셜메이커' })
    ).toBe(true)
  })

  it('요청자 주성향이 후보 보조성향과 같으면 true를 반환한다 (대칭 확인)', () => {
    expect(
      passesHobbyFilter({ primary: '딥다이버', secondary: '무드트래블러' }, { primary: '소셜메이커', secondary: '딥다이버' })
    ).toBe(true)
  })

  it('겹치는 성향이 하나도 없으면 false를 반환한다', () => {
    expect(
      passesHobbyFilter({ primary: '딥다이버', secondary: '무드트래블러' }, { primary: '에너지러', secondary: '소셜메이커' })
    ).toBe(false)
  })

  it('testa 기준으로 testb를 평가하면 true (기존 통과 케이스 유지)', () => {
    const testa = { primary: '딥다이버', secondary: '무드트래블러' }
    const testb = { primary: '소셜메이커', secondary: '딥다이버' }
    expect(passesHobbyFilter(testa, testb)).toBe(true)
  })

  it('testb 기준으로 testa를 평가해도 true (기존에 비대칭이었던 케이스가 수정됨)', () => {
    const testb = { primary: '소셜메이커', secondary: '딥다이버' }
    const testa = { primary: '딥다이버', secondary: '무드트래블러' }
    expect(passesHobbyFilter(testb, testa)).toBe(true)
  })

  it('testc 기준으로 testb를 평가하면 true (기존에 비대칭이었던 케이스가 수정됨)', () => {
    const testc = { primary: '에너지러', secondary: '소셜메이커' }
    const testb = { primary: '소셜메이커', secondary: '딥다이버' }
    expect(passesHobbyFilter(testc, testb)).toBe(true)
  })

  it('testa와 testc는 서로 겹치는 성향이 없어 false를 반환한다', () => {
    const testa = { primary: '딥다이버', secondary: '무드트래블러' }
    const testc = { primary: '에너지러', secondary: '소셜메이커' }
    expect(passesHobbyFilter(testa, testc)).toBe(false)
    expect(passesHobbyFilter(testc, testa)).toBe(false)
  })
})
