import { getSignalStatus } from './signal'

describe('getSignalStatus', () => {
  describe('정상 케이스', () => {
    it('0~2일이면 green을 반환한다', () => {
      expect(getSignalStatus(0)).toBe('green')
      expect(getSignalStatus(1)).toBe('green')
      expect(getSignalStatus(2)).toBe('green')
    })

    it('3~6일이면 yellow를 반환한다', () => {
      expect(getSignalStatus(3)).toBe('yellow')
      expect(getSignalStatus(4)).toBe('yellow')
      expect(getSignalStatus(5)).toBe('yellow')
      expect(getSignalStatus(6)).toBe('yellow')
    })

    it('7일 이상이면 red를 반환한다', () => {
      expect(getSignalStatus(7)).toBe('red')
      expect(getSignalStatus(10)).toBe('red')
      expect(getSignalStatus(100)).toBe('red')
    })
  })

  describe('경계값', () => {
    it('2일은 green, 3일은 yellow', () => {
      expect(getSignalStatus(2)).toBe('green')
      expect(getSignalStatus(3)).toBe('yellow')
    })

    it('6일은 yellow, 7일은 red', () => {
      expect(getSignalStatus(6)).toBe('yellow')
      expect(getSignalStatus(7)).toBe('red')
    })
  })

  describe('특수 값', () => {
    it('0일(오늘 연락)은 green을 반환한다', () => {
      expect(getSignalStatus(0)).toBe('green')
    })

    it('음수(미래 날짜 등)는 green을 반환한다', () => {
      expect(getSignalStatus(-1)).toBe('green')
    })
  })

  describe('실패 케이스 — 잘못된 status가 반환되면 안 됨', () => {
    it('green 구간(0~2일)에서는 yellow/red를 반환하지 않는다', () => {
      for (const days of [0, 1, 2]) {
        expect(getSignalStatus(days)).not.toBe('yellow')
        expect(getSignalStatus(days)).not.toBe('red')
      }
    })

    it('yellow 구간(3~6일)에서는 green/red를 반환하지 않는다', () => {
      for (const days of [3, 4, 5, 6]) {
        expect(getSignalStatus(days)).not.toBe('green')
        expect(getSignalStatus(days)).not.toBe('red')
      }
    })

    it('red 구간(7일+)에서는 green/yellow를 반환하지 않는다', () => {
      for (const days of [7, 14, 30]) {
        expect(getSignalStatus(days)).not.toBe('green')
        expect(getSignalStatus(days)).not.toBe('yellow')
      }
    })

    it('경계 직전 소수는 아직 green/yellow여야 한다', () => {
      expect(getSignalStatus(2.9)).toBe('green')
      expect(getSignalStatus(2.9)).not.toBe('yellow')
      expect(getSignalStatus(6.9)).toBe('yellow')
      expect(getSignalStatus(6.9)).not.toBe('red')
    })

    it('경계 직후 소수는 yellow/red로 올라가야 한다', () => {
      expect(getSignalStatus(3.0)).toBe('yellow')
      expect(getSignalStatus(3.0)).not.toBe('green')
      expect(getSignalStatus(7.0)).toBe('red')
      expect(getSignalStatus(7.0)).not.toBe('yellow')
    })
  })

  describe('실패 케이스 — 비정상 입력', () => {
    it('NaN이 들어오면 green을 반환한다 (현재 동작)', () => {
      expect(getSignalStatus(Number.NaN)).toBe('green')
    })

    it('Infinity는 red를 반환한다', () => {
      expect(getSignalStatus(Number.POSITIVE_INFINITY)).toBe('red')
    })
  })
})
