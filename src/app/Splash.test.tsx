import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import Splash, {
  SPLASH_FADE_MS,
  SPLASH_REDUCED_VISIBLE_MS,
  SPLASH_SEEN_KEY,
  SPLASH_VISIBLE_MS,
} from './Splash'

const querySplash = () => document.querySelector('.app-splash')

const mockMatchMedia = (reducedMotion: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

describe('Splash', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.useFakeTimers()
    mockMatchMedia(false)
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
  })

  it('첫 진입에 표시되고 세션 노출 키를 기록한다', () => {
    render(<Splash />)

    expect(querySplash()).not.toBeNull()
    expect(window.sessionStorage.getItem(SPLASH_SEEN_KEY)).toBe('true')
  })

  it('1.5초 뒤 페이드아웃을 거쳐 제거된다', () => {
    render(<Splash />)

    act(() => {
      vi.advanceTimersByTime(SPLASH_VISIBLE_MS)
    })
    expect(querySplash()?.getAttribute('data-leaving')).toBe('true')

    act(() => {
      vi.advanceTimersByTime(SPLASH_FADE_MS)
    })
    expect(querySplash()).toBeNull()
  })

  it('화면을 탭하면 즉시 사라진다', () => {
    render(<Splash />)

    const splash = querySplash()
    expect(splash).not.toBeNull()
    fireEvent.click(splash as Element)

    expect(querySplash()).toBeNull()
  })

  it('키 입력으로도 즉시 사라진다', () => {
    render(<Splash />)

    fireEvent.keyDown(window, { key: 'Enter' })

    expect(querySplash()).toBeNull()
  })

  it('같은 세션에서 다시 렌더되면 표시하지 않는다', () => {
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, 'true')

    render(<Splash />)

    expect(querySplash()).toBeNull()
  })

  it('모션 축소 설정에서는 페이드 없이 1초 뒤 바로 제거된다', () => {
    mockMatchMedia(true)

    render(<Splash />)

    act(() => {
      vi.advanceTimersByTime(SPLASH_REDUCED_VISIBLE_MS)
    })
    expect(querySplash()).toBeNull()
  })
})
