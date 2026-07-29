import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { evaluateBadges, getBadgeDex } from '../lib/badgeSystem.js'
import { playConfetti } from '../lib/confetti.js'
import { getLevelState, getMealsByDateRange, getQuestClaimStats, getUnlockedBadgeIds, unlockBadge } from '../lib/dataStore.js'
import { getLevelProgress } from '../lib/levelSystem.js'
import { toDateKey } from '../lib/records.js'
import { calcStreak } from '../lib/streak.js'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

const LOOKBACK_DAYS = 90

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// 도감 모달(FR-13) — ConfirmDialog/MealCardExporter와 동일한 모달 셸을 재사용한다. 마운트 시 새로
// 조건을 만족한 뱃지가 있으면 dataStore.unlockBadge로 영구 저장하고 playConfetti()를 재생한다(요청
// 원문의 명시적 요구사항). 목록 자체는 재평가 없이 저장된 unlockedIds만 신뢰한다(getBadgeDex).
export default function BadgeDexModal({ onClose }) {
  const { effectiveUserId } = useUser()
  const [dex, setDex] = useState(null)

  function handleClose() {
    onClose(dex ? dex.filter((b) => b.unlocked).map((b) => b.id) : null)
  }

  const containerRef = useFocusTrap(true, handleClose)

  useEffect(() => {
    let cancelled = false

    async function evaluate() {
      const dateKey = toDateKey(new Date())
      const startKey = toDateKey(daysAgo(LOOKBACK_DAYS))
      const [byDate, { totalXp }, questStats, unlockedIds] = await Promise.all([
        getMealsByDateRange(startKey, dateKey),
        getLevelState(),
        getQuestClaimStats(),
        getUnlockedBadgeIds(),
      ])
      if (cancelled) return

      const streak = calcStreak(Object.keys(byDate), dateKey)
      const { level } = getLevelProgress(totalXp)
      const ctx = {
        streakCurrent: streak.current,
        level,
        totalClaimedQuestCount: questStats.totalCount,
        countsByQuestId: questStats.countsByQuestId,
      }

      const newBadges = evaluateBadges(ctx, unlockedIds)
      let finalUnlockedIds = unlockedIds
      for (const badge of newBadges) {
        const result = await unlockBadge(badge.id)
        finalUnlockedIds = result.unlockedIds
      }
      if (cancelled) return

      if (newBadges.length > 0) playConfetti()
      setDex(getBadgeDex(finalUnlockedIds))
    }

    evaluate().catch(() => {
      if (!cancelled) setDex(getBadgeDex([]))
    })

    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-dex-title"
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(25, 31, 40, 0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: layout.pagePaddingX,
      }}
      onClick={handleClose}
    >
      <div
        className="tds-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          background: colors.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: spacing.xl,
          marginBottom: `calc(${spacing.xl}px + env(safe-area-inset-bottom))`,
          boxSizing: 'border-box',
        }}
      >
        <h3 id="badge-dex-title" style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.lg, color: colors.textStrong }}>
          배지 도감
        </h3>

        {!dex ? (
          <p style={{ color: colors.textSub, fontSize: font.size.sm }}>불러오는 중...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md, marginBottom: spacing.lg }}>
            {dex.map((badge) => (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: spacing.sm,
                  borderRadius: radius.sm,
                  background: colors.bg,
                  opacity: badge.unlocked ? 1 : 0.45,
                }}
              >
                <span style={{ fontSize: 28, filter: badge.unlocked ? 'none' : 'grayscale(1)' }} aria-hidden="true">
                  {badge.icon}
                </span>
                <span style={{ marginTop: spacing.xs, fontSize: font.size.xs, fontWeight: 700, color: colors.textStrong }}>
                  {badge.title}
                </span>
                <span style={{ marginTop: 2, fontSize: 10, color: colors.textSub }}>{badge.description}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="tds-press"
          onClick={handleClose}
          style={{
            display: 'block',
            margin: '0 auto',
            background: 'none',
            border: 'none',
            fontSize: font.size.sm,
            fontWeight: 600,
            padding: 0,
            color: colors.muted,
            cursor: 'pointer',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
