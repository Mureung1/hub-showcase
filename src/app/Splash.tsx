import { useEffect, useState } from 'react'

export const SPLASH_SEEN_KEY = 'dabnyangi:splash-seen'
export const SPLASH_VISIBLE_MS = 1500
export const SPLASH_REDUCED_VISIBLE_MS = 1000
export const SPLASH_FADE_MS = 300

type SplashPhase = 'visible' | 'leaving' | 'gone'

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Splash() {
  const [phase, setPhase] = useState<SplashPhase>(() =>
    window.sessionStorage.getItem(SPLASH_SEEN_KEY) === 'true' ? 'gone' : 'visible',
  )

  useEffect(() => {
    if (phase !== 'visible') {
      return
    }
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, 'true')
    const reduced = prefersReducedMotion()
    const timer = window.setTimeout(
      () => setPhase(reduced ? 'gone' : 'leaving'),
      reduced ? SPLASH_REDUCED_VISIBLE_MS : SPLASH_VISIBLE_MS,
    )
    const skip = () => setPhase('gone')
    window.addEventListener('keydown', skip)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', skip)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'leaving') {
      return
    }
    const timer = window.setTimeout(() => setPhase('gone'), SPLASH_FADE_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  if (phase === 'gone') {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="app-splash"
      data-leaving={phase === 'leaving'}
      onClick={() => setPhase('gone')}
    >
      <span className="app-splash-eyebrow">대학생 메시지 작성 도우미</span>
      <strong className="app-splash-brand">답냥이</strong>
      <p className="app-splash-tagline">꺼내기 어려운 말을 관계와 목적에 맞춰 3가지 톤으로 바로 써줘요.</p>
    </div>
  )
}

export default Splash
