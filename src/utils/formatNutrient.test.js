// TDD 1단계: 실패하는 테스트 먼저.
// src/utils/formatNutrient.js 는 아직 존재하지 않는다 — 일부러 만들지 않았다.
// 이 import가 해결되지 않아 테스트는 "실패"한다(RED). 다음 단계에서 함수를 만든다.
import { describe, it, expect } from 'vitest'
import { formatNutrient } from './formatNutrient.js'

describe('formatNutrient', () => {
  describe('요구사항 1: 소수점이 있는 숫자를 정수로 반올림한다', () => {
    it('24.9999 -> 25 (올림쪽으로 반올림)', () => {
      expect(formatNutrient(24.9999)).toBe(25)
    })

    it('34.0000001 -> 34 (내림쪽으로 반올림)', () => {
      expect(formatNutrient(34.0000001)).toBe(34)
    })

    it('1100.5 -> 1101 (정확히 .5는 올린다)', () => {
      expect(formatNutrient(1100.5)).toBe(1101)
    })

    it('이미 정수인 값은 그대로 반환한다', () => {
      expect(formatNutrient(42)).toBe(42)
    })
  })

  describe('요구사항 2: 0은 0으로 반환한다', () => {
    it('0 -> 0', () => {
      expect(formatNutrient(0)).toBe(0)
    })

    it('0에 가까운 소수도 0이 된다', () => {
      expect(formatNutrient(0.4)).toBe(0)
    })
  })

  describe('요구사항 3: 숫자가 아닌 값은 0을 반환한다', () => {
    it('null -> 0', () => {
      expect(formatNutrient(null)).toBe(0)
    })

    it('undefined -> 0', () => {
      expect(formatNutrient(undefined)).toBe(0)
    })

    it('인자를 아예 넘기지 않으면 0', () => {
      expect(formatNutrient()).toBe(0)
    })
  })

  describe('반환 타입', () => {
    it('문자열이 아니라 숫자를 반환한다', () => {
      expect(typeof formatNutrient(24.9999)).toBe('number')
    })
  })
})
