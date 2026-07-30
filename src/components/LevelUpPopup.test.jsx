import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import LevelUpPopup from './LevelUpPopup.jsx'
import { playConfetti } from '../lib/confetti.js'

vi.mock('../lib/confetti.js', () => ({ playConfetti: vi.fn() }))

describe('LevelUpPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('마운트 즉시 컨페티를 재생하고 등장 애니메이션 클래스로 표시된다', () => {
    render(<LevelUpPopup level={5} onDone={() => {}} />)
    expect(playConfetti).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Lv.5')).toBeInTheDocument()
    expect(screen.getByText('🎉 레벨업!')).toBeInTheDocument()
    expect(screen.getByText('🎉 레벨업!').parentElement).toHaveClass('tds-tab-bounce')
  })

  it('일정 시간 후 퇴장 애니메이션으로 전환되고, 그 뒤 onDone이 호출된다', async () => {
    const onDone = vi.fn()
    render(<LevelUpPopup level={3} onDone={onDone} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400)
    })
    expect(screen.getByText('Lv.3')).toBeInTheDocument()
    expect(screen.getByText('🎉 레벨업!').parentElement).toHaveClass('tds-levelup-out')
    expect(onDone).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(220)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
