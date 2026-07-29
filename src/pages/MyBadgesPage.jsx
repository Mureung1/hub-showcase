import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import ProgressBarFill from '../components/ProgressBarFill.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import { useUser } from '../context/UserContext.jsx'
import { evaluateBadges, getBadgeDex } from '../lib/badgeSystem.js'
import { playConfetti } from '../lib/confetti.js'
import { getLevelState, getMealsByDateRange, getQuestClaimStats, getUnlockedBadgeIds, unlockBadge } from '../lib/dataStore.js'
import { getLevelProgress } from '../lib/levelSystem.js'
import { toDateKey } from '../lib/records.js'
import { calcStreak } from '../lib/streak.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const LOOKBACK_DAYS = 90

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// MY 탭 개편 — 예전 BadgeDexModal(바텀시트)의 평가/언락 로직을 그대로 옮긴 전용 화면. 마운트 시 새로
// 조건을 만족한 뱃지가 있으면 즉시 unlockBadge로 저장하고 playConfetti()를 재생한다. 잠긴 뱃지는
// badgeSystem.js의 progressOf가 계산한 progress({current,target})로 "3/7일" 같은 진행률을 보여준다.
export default function MyBadgesPage() {
  const navigate = useNavigate()
  const { effectiveUserId } = useUser()
  const [dex, setDex] = useState(null)

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
        // eslint-disable-next-line no-await-in-loop
        const result = await unlockBadge(badge.id)
        finalUnlockedIds = result.unlockedIds
      }
      if (cancelled) return

      if (newBadges.length > 0) playConfetti()
      setDex(getBadgeDex(finalUnlockedIds, ctx))
    }

    evaluate().catch(() => {
      if (!cancelled) setDex(getBadgeDex([]))
    })

    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  const unlockedCount = dex?.filter((b) => b.unlocked).length ?? 0

  return (
    <div style={styles.page}>
      <ScreenHeader title="배지 도감" onBack={() => navigate('/profile')} />

      {dex && (
        <Card style={{ marginBottom: spacing.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>
              획득 배지 {unlockedCount}/{dex.length}개
            </p>
            <span style={{ fontSize: font.size.xs, color: colors.textSub }}>{Math.round((unlockedCount / dex.length) * 100)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: radius.pill, background: colors.bg, overflow: 'hidden' }}>
            <ProgressBarFill percent={(unlockedCount / dex.length) * 100} color={colors.primary} />
          </div>
        </Card>
      )}

      {!dex ? (
        <p style={{ color: colors.textSub, fontSize: font.size.sm }}>불러오는 중...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
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
                background: colors.surface,
                boxShadow: badge.unlocked ? styles.card.boxShadow : 'none',
                border: badge.unlocked ? 'none' : `1px solid ${colors.border}`,
                opacity: badge.unlocked ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: 28, filter: badge.unlocked ? 'none' : 'grayscale(1)' }} aria-hidden="true">
                {badge.icon}
              </span>
              <span style={{ marginTop: spacing.xs, fontSize: font.size.xs, fontWeight: 700, color: colors.textStrong }}>
                {badge.title}
              </span>
              {badge.unlocked ? (
                <span style={{ marginTop: 2, fontSize: 10, color: colors.textSub }}>{badge.description}</span>
              ) : (
                badge.progress && (
                  <span style={{ marginTop: 2, fontSize: 10, color: colors.muted, fontWeight: 700 }}>
                    {badge.progress.current}/{badge.progress.target}
                  </span>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
