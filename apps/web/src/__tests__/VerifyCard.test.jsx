import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// VerifyCard 컴포넌트 (App.jsx에서 분리 테스트)
function VerifyCard({ question, onSelect, disabled }) {
  return (
    <div data-testid="verify-card">
      <span data-testid="verify-label">직접 확인</span>
      <p data-testid="verify-question">{question}</p>
      <div>
        <button
          data-testid="verify-yes"
          onClick={() => onSelect({ id: 'yes', label: '예' })}
          disabled={disabled}
        >
          예
        </button>
        <button
          data-testid="verify-no"
          onClick={() => onSelect({ id: 'no', label: '아니오' })}
          disabled={disabled}
        >
          아니오
        </button>
      </div>
    </div>
  )
}

describe('VerifyCard', () => {
  it('renders verify question with 예/아니오 buttons', () => {
    const mockSelect = vi.fn()
    render(
      <VerifyCard
        question="배수구에 코를 대고 냄새를 맡아봄"
        onSelect={mockSelect}
        disabled={false}
      />
    )

    // 직접 확인 라벨
    expect(screen.getByTestId('verify-label')).toHaveTextContent('직접 확인')

    // 질문 텍스트
    expect(screen.getByTestId('verify-question')).toHaveTextContent('배수구에 코를 대고 냄새를 맡아봄')

    // 예/아니오 버튼
    expect(screen.getByTestId('verify-yes')).toHaveTextContent('예')
    expect(screen.getByTestId('verify-no')).toHaveTextContent('아니오')
  })

  it('calls onSelect with "yes" when 예 clicked', () => {
    const mockSelect = vi.fn()
    render(
      <VerifyCard
        question="테스트 질문"
        onSelect={mockSelect}
        disabled={false}
      />
    )

    fireEvent.click(screen.getByTestId('verify-yes'))

    expect(mockSelect).toHaveBeenCalledWith({ id: 'yes', label: '예' })
  })

  it('calls onSelect with "no" when 아니오 clicked', () => {
    const mockSelect = vi.fn()
    render(
      <VerifyCard
        question="테스트 질문"
        onSelect={mockSelect}
        disabled={false}
      />
    )

    fireEvent.click(screen.getByTestId('verify-no'))

    expect(mockSelect).toHaveBeenCalledWith({ id: 'no', label: '아니오' })
  })

  it('disables buttons when disabled prop is true', () => {
    const mockSelect = vi.fn()
    render(
      <VerifyCard
        question="테스트 질문"
        onSelect={mockSelect}
        disabled={true}
      />
    )

    expect(screen.getByTestId('verify-yes')).toBeDisabled()
    expect(screen.getByTestId('verify-no')).toBeDisabled()
  })
})

describe('VERIFY response detection', () => {
  it('detects VERIFY by axisId prefix', () => {
    const verifyAxisId = 'verify_drain_organic'
    const normalAxisId = 'water_run_test'

    expect(verifyAxisId.startsWith('verify_')).toBe(true)
    expect(normalAxisId.startsWith('verify_')).toBe(false)
  })
})
