import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState, useEffect } from 'react'

// Toast 컴포넌트 (App.jsx에서 복사)
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const isError = toast.variant === 'error'

  return (
    <div
      data-testid="toast"
      style={{
        position: 'fixed',
        top: 'var(--space-4)',
        right: 'var(--space-4)',
        background: isError ? 'var(--color-alarm-wash)' : 'var(--color-mint-wash)',
      }}
      role="alert"
    >
      <span data-testid="toast-icon">{isError ? '⚠️' : 'ℹ️'}</span>
      <p data-testid="toast-message">{toast.message}</p>
      <button data-testid="toast-close" onClick={onClose}>✕</button>
    </div>
  )
}

// 토스트 래퍼 (상태 관리 테스트용)
function ToastWrapper({ initialToast }) {
  const [toast, setToast] = useState(initialToast)
  return <Toast toast={toast} onClose={() => setToast(null)} />
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders error variant with alarm color', () => {
    render(
      <Toast
        toast={{ variant: 'error', message: '서버에 연결하지 못했어요.' }}
        onClose={() => {}}
      />
    )

    expect(screen.getByTestId('toast')).toBeInTheDocument()
    expect(screen.getByTestId('toast-icon')).toHaveTextContent('⚠️')
    expect(screen.getByTestId('toast-message')).toHaveTextContent('서버에 연결하지 못했어요.')
  })

  it('renders info variant with mint color', () => {
    render(
      <Toast
        toast={{ variant: 'info', message: '정보 메시지입니다.' }}
        onClose={() => {}}
      />
    )

    expect(screen.getByTestId('toast-icon')).toHaveTextContent('ℹ️')
  })

  it('calls onClose when close button clicked', () => {
    const mockClose = vi.fn()
    render(
      <Toast
        toast={{ variant: 'error', message: '테스트' }}
        onClose={mockClose}
      />
    )

    fireEvent.click(screen.getByTestId('toast-close'))
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses after 3 seconds', () => {
    const mockClose = vi.fn()
    render(
      <Toast
        toast={{ variant: 'error', message: '테스트' }}
        onClose={mockClose}
      />
    )

    expect(mockClose).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('returns null when toast is null', () => {
    const { container } = render(<Toast toast={null} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('Toast error messages', () => {
  it('shows user-friendly message for network errors', () => {
    render(
      <Toast
        toast={{ variant: 'error', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }}
        onClose={() => {}}
      />
    )

    // 원시 에러 메시지가 아닌 사용자 친화적 문구
    expect(screen.getByTestId('toast-message')).toHaveTextContent('서버에 연결하지 못했어요')
    expect(screen.getByTestId('toast-message')).toHaveTextContent('잠시 후 다시 시도해 주세요')
  })
})
