import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import DonutChart from './DonutChart'

// 이 프로젝트 setupTests.js는 자동 cleanup을 등록하지 않으므로, 이 파일처럼
// 같은 텍스트(0%, NaN% 등)가 여러 케이스에 걸쳐 겹치는 테스트는 직접 정리해야 함
afterEach(() => {
  cleanup()
})

const CIRCUMFERENCE = 2 * Math.PI * 60 // r=60 고정값과 동일하게 맞춤

// 두 번째 <circle>(매칭 색상)의 stroke-dasharray를 [okLen, noLen] 숫자 배열로 파싱
function getOkDasharray(container) {
  const okCircle = container.querySelectorAll('circle')[1]
  return okCircle.getAttribute('stroke-dasharray').split(' ').map(Number)
}

describe('DonutChart', () => {
  describe('정상 케이스', () => {
    it('ratio=0.5일 때 50%와 5 / 10건을 표시하고, 원호를 정확히 절반씩 나눈다', () => {
      const { container } = render(<DonutChart ratio={0.5} matched={5} total={10} />)

      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('5 / 10건')).toBeInTheDocument()

      const [okLen, noLen] = getOkDasharray(container)
      expect(okLen).toBeCloseTo(CIRCUMFERENCE * 0.5, 1)
      expect(noLen).toBeCloseTo(CIRCUMFERENCE * 0.5, 1)
    })

    it('ratio=0.3일 때 30%와 3 / 10건을 표시한다', () => {
      render(<DonutChart ratio={0.3} matched={3} total={10} />)
      expect(screen.getByText('30%')).toBeInTheDocument()
      expect(screen.getByText('3 / 10건')).toBeInTheDocument()
    })
  })

  describe('경계값', () => {
    it('ratio=0이면 0%를 표시하고 매칭 원호 길이가 0이다', () => {
      const { container } = render(<DonutChart ratio={0} matched={0} total={10} />)
      expect(screen.getByText('0%')).toBeInTheDocument()

      const [okLen] = getOkDasharray(container)
      expect(okLen).toBe(0)
    })

    it('ratio=1이면 100%를 표시하고 매칭 원호 길이가 전체 둘레와 같다', () => {
      const { container } = render(<DonutChart ratio={1} matched={10} total={10} />)
      expect(screen.getByText('100%')).toBeInTheDocument()

      const [okLen, noLen] = getOkDasharray(container)
      expect(okLen).toBeCloseTo(CIRCUMFERENCE, 1)
      expect(noLen).toBeCloseTo(0, 1)
    })

    it('반올림 경계: 0.4%는 0%로, 0.6%는 1%로 반올림된다', () => {
      const { rerender } = render(<DonutChart ratio={0.004} matched={0} total={250} />)
      expect(screen.getByText('0%')).toBeInTheDocument()

      rerender(<DonutChart ratio={0.006} matched={2} total={334} />)
      expect(screen.getByText('1%')).toBeInTheDocument()
    })
  })

  describe('빈 값 / 누락', () => {
    it('total=0, matched=0, ratio=0이면 0 / 0건을 표시한다', () => {
      render(<DonutChart ratio={0} matched={0} total={0} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('0 / 0건')).toBeInTheDocument()
    })

    it('ratio가 NaN이면 NaN%가 그대로 노출된다 (방어 코드 없음)', () => {
      render(<DonutChart ratio={NaN} matched={0} total={0} />)
      expect(screen.getByText('NaN%')).toBeInTheDocument()
    })

    it('matched/total이 undefined이면 값 없이 "/ 건"만 남는다 (React가 undefined 자식을 렌더링하지 않음)', () => {
      render(<DonutChart ratio={0} matched={undefined} total={undefined} />)
      expect(screen.getByText('/ 건')).toBeInTheDocument()
    })
  })

  describe('실패하는 경우 (비정상 입력)', () => {
    it('ratio가 1을 초과하면 stroke-dasharray 두 번째 값이 음수가 된다', () => {
      const { container } = render(<DonutChart ratio={1.2} matched={12} total={10} />)
      const [, noLen] = getOkDasharray(container)
      expect(noLen).toBeLessThan(0)
    })

    it('ratio가 음수이면 stroke-dasharray 첫 번째 값이 음수가 된다', () => {
      const { container } = render(<DonutChart ratio={-0.3} matched={-3} total={10} />)
      const [okLen] = getOkDasharray(container)
      expect(okLen).toBeLessThan(0)
    })

    it('ratio가 문자열이면 계산이 깨져 NaN%가 노출된다', () => {
      render(<DonutChart ratio={'50%'} matched={5} total={10} />)
      expect(screen.getByText('NaN%')).toBeInTheDocument()
    })
  })
})
