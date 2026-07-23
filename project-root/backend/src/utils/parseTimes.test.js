import { describe, expect, it } from 'vitest'
import mod from './parseTimes.js'

const { parseTimes } = mod

describe('parseTimes', () => {
  describe('정상 케이스', () => {
    it('단일 시간대를 파싱한다', () => {
      expect(parseTimes('화 09:00 ~ 10:30')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
      ])
    })

    it('콤마로 구분된 여러 시간대를 파싱한다', () => {
      expect(parseTimes('화 09:00 ~ 10:30,목 10:30 ~ 12:00')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
        { day: '목', start: '10:30', end: '12:00' },
      ])
    })

    it('물결 앞뒤에 공백이 없어도 파싱한다', () => {
      expect(parseTimes('화 09:00~10:30')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
      ])
    })

    it('3개 이상 시간대의 순서를 유지한다', () => {
      const result = parseTimes('화 09:00 ~ 10:30,목 10:30 ~ 12:00,금 13:00 ~ 14:30')
      expect(result.map((t) => t.day)).toEqual(['화', '목', '금'])
    })

    it('전체 문자열 앞뒤 공백을 허용한다', () => {
      expect(parseTimes(' 화 09:00 ~ 10:30 ')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
      ])
    })

    it('요일-시간 사이에 공백이 여러 칸이어도 day를 정확히 추출한다', () => {
      expect(parseTimes('화  09:00 ~ 10:30')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
      ])
    })
  })

  describe('빈 값', () => {
    it('null이면 빈 배열을 반환한다', () => {
      expect(parseTimes(null)).toEqual([])
    })

    it('undefined면 빈 배열을 반환한다', () => {
      expect(parseTimes(undefined)).toEqual([])
    })

    it('빈 문자열이면 빈 배열을 반환한다', () => {
      expect(parseTimes('')).toEqual([])
    })

    it('인자를 넘기지 않으면 빈 배열을 반환한다', () => {
      expect(parseTimes()).toEqual([])
    })
  })

  describe('경계값', () => {
    it('콤마 뒤 공백이 있어도 다음 조각을 정상 파싱한다', () => {
      expect(parseTimes('화 09:00 ~ 10:30, 목 10:30 ~ 12:00')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
        { day: '목', start: '10:30', end: '12:00' },
      ])
    })

    it('시작 시각과 종료 시각이 같아도 파싱은 성공한다', () => {
      expect(parseTimes('화 09:00 ~ 09:00')).toEqual([
        { day: '화', start: '09:00', end: '09:00' },
      ])
    })

    it('한 자리 시(hour)도 파싱한다', () => {
      expect(parseTimes('화 9:00 ~ 10:30')).toEqual([
        { day: '화', start: '9:00', end: '10:30' },
      ])
    })
  })

  describe('실패하는 경우', () => {
    it('트레일링 콤마로 생긴 빈 조각은 무시한다', () => {
      expect(parseTimes('화 09:00 ~ 10:30,')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
      ])
    })

    it('중복 콤마로 생긴 빈 조각은 무시한다', () => {
      expect(parseTimes('화 09:00 ~ 10:30,,목 10:30 ~ 12:00')).toEqual([
        { day: '화', start: '09:00', end: '10:30' },
        { day: '목', start: '10:30', end: '12:00' },
      ])
    })

    it('종료 시각(~ 이후)이 없으면 에러를 던진다', () => {
      expect(() => parseTimes('화 09:00')).toThrow('시간 형식을 해석할 수 없습니다')
    })

    it('요일과 시작 시각 사이에 공백이 없으면 에러를 던진다', () => {
      expect(() => parseTimes('화09:00 ~ 10:30')).toThrow('시간 형식을 해석할 수 없습니다')
    })

    it('형식 자체가 다른 문자열이면 에러를 던진다', () => {
      expect(() => parseTimes('invalid')).toThrow('시간 형식을 해석할 수 없습니다')
    })

    it('여러 시간대 중 하나만 깨져 있어도 전체가 에러를 던진다', () => {
      expect(() => parseTimes('화 09:00 ~ 10:30,invalid')).toThrow()
    })
  })
})
