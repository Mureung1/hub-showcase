import { useEffect, useState } from 'react'
import AchievementRing from './AchievementRing.jsx'
import { playConfetti } from '../lib/confetti.js'
import { colors, font, radius, shadow, spacing } from '../styles/theme.js'

// 홈 화면(Analyze.jsx) 레벨업 연출(FR-12, 시각 강화 FR-14) — "게임처럼" 잠깐 나타났다 팝업처럼
// 사라진다. confetti.js와 마찬가지로 position:fixed 오버레이 하나를 잠깐 띄우는 방식이되, 이쪽은 원형
// 배지+텍스트라 React 컴포넌트로 만들어 등장(신규 tds-levelup-badge-in)/유지/퇴장(tds-levelup-out)을
// 상태로 제어한다. 배지 안 링(AchievementRing)은 마운트 직후 0→100%로 채워 "달성" 느낌을 강조한다.
const VISIBLE_MS = 1400
const EXIT_MS = 220
const RING_FILL_DELAY_MS = 60

export default function LevelUpPopup({ level, onDone }) {
  const [exiting, setExiting] = useState(false)
  const [ringPercent, setRingPercent] = useState(0)

  // 레벨업 자체가 요청 원문의 "게임처럼" 연출 대상이라, 뱃지 획득과 마찬가지로 컨페티를 함께 재생한다.
  useEffect(() => {
    playConfetti()
    const fillTimer = setTimeout(() => setRingPercent(100), RING_FILL_DELAY_MS)
    const exitTimer = setTimeout(() => setExiting(true), VISIBLE_MS)
    return () => {
      clearTimeout(fillTimer)
      clearTimeout(exitTimer)
    }
  }, [])

  useEffect(() => {
    if (!exiting) return undefined
    const timer = setTimeout(() => onDone(), EXIT_MS)
    return () => clearTimeout(timer)
  }, [exiting, onDone])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(25, 31, 40, 0.45)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 220ms ease-in',
      }}
    >
      <div
        className={exiting ? 'tds-levelup-out' : 'tds-tab-bounce'}
        style={{
          background: colors.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: `${spacing.xl}px`,
          textAlign: 'center',
        }}
      >
        <div className={exiting ? undefined : 'tds-levelup-badge-in'} style={{ margin: '0 auto' }}>
          <AchievementRing percent={ringPercent} size={128} strokeWidth={12}>
            <span style={{ fontSize: font.size.xxl, fontWeight: 800, color: colors.title }}>Lv.{level}</span>
          </AchievementRing>
        </div>
        <p style={{ margin: `${spacing.md}px 0 0`, fontSize: font.size.lg, fontWeight: 800, color: colors.textStrong }}>
          🎉 레벨업!
        </p>
      </div>
    </div>
  )
}
