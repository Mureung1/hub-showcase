import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from './Card.jsx'
import ProgressBarFill from './ProgressBarFill.jsx'
import { useUser } from '../context/UserContext.jsx'
import { BADGES } from '../lib/badgeSystem.js'
import { getUnlockedBadgeIds, getXpEarnedInRange } from '../lib/dataStore.js'
import { logicalDateKey } from '../lib/logicalDate.js'
import { getXpLeaderboard } from '../lib/xpLeaderboard.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭 개편(1a/2a 시안) — 예전엔 LevelCard(레벨+XP 바)와 ProfileSummaryStats(오늘 XP·주간 퀘스트·
// 배지 3칸)가 별개 카드 2장이었다. 이제 하나로 합치고, 리더보드 순위 칩(로그인 계정만 —
// MyLeaderboardPage.jsx와 같은 getXpLeaderboard 재사용, 게스트는 비교할 고정 신원이 없어 칩 자체를
// 숨긴다)을 새로 추가했다. id="my-level-pill"은 xpFlyAnimation.js가 어느 화면(홈/MY)에서 XP 클레임이
// 일어나든 지금 보이는 레벨 표시로 애니메이션이 날아가게 하는 좌표 타깃이라 그대로 유지해야 한다.
export default function StatusCard({ questBoard }) {
  const navigate = useNavigate()
  const { levelProgress: progress, authMode, effectiveUserId } = useUser()
  const [todayXp, setTodayXp] = useState(null)
  const [badgeCount, setBadgeCount] = useState(null)
  const [rank, setRank] = useState(null)

  useEffect(() => {
    let cancelled = false
    const todayKey = logicalDateKey(new Date())
    Promise.all([getXpEarnedInRange(todayKey, todayKey), getUnlockedBadgeIds()])
      .then(([xp, unlockedIds]) => {
        if (cancelled) return
        setTodayXp(xp)
        setBadgeCount(unlockedIds.length)
      })
      .catch(() => {
        if (!cancelled) {
          setTodayXp(0)
          setBadgeCount(0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  // 리더보드 순위 — 로그인 계정끼리만 비교하는 기존 원칙 그대로(게스트는 기기에 묶인 임시 식별자뿐).
  useEffect(() => {
    if (authMode !== 'user') {
      setRank(null)
      return undefined
    }
    let cancelled = false
    getXpLeaderboard()
      .then((rows) => {
        if (!cancelled) setRank(rows.find((r) => r.isMe)?.rank ?? null)
      })
      .catch(() => {
        if (!cancelled) setRank(null)
      })
    return () => {
      cancelled = true
    }
  }, [authMode, effectiveUserId])

  if (!progress) return null

  const percent = progress.isMaxLevel ? 100 : (progress.xpIntoLevel / progress.xpForNextLevel) * 100
  const weeklyClaimed = questBoard?.weekly?.filter((q) => q.claimed).length ?? null
  const weeklyTotal = questBoard?.weekly?.length ?? 5

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm }}>
        <div id="my-level-pill" style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: colors.textStrong, whiteSpace: 'nowrap' }}>Lv.{progress.level}</span>
          {rank != null && (
            <button
              type="button"
              className="tds-press"
              onClick={() => navigate('/profile/leaderboard')}
              style={{
                border: 'none',
                fontSize: 11.5,
                fontWeight: 700,
                color: colors.primary,
                background: colors.primarySurface,
                padding: '3px 8px',
                borderRadius: radius.pill,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              리더보드 {rank}위
            </button>
          )}
        </div>
        <span style={{ fontSize: font.size.xs, color: colors.muted, whiteSpace: 'nowrap' }}>
          {progress.isMaxLevel ? (
            '만렙을 달성했어요!'
          ) : (
            <>
              다음 레벨까지{' '}
              <b style={{ color: colors.textSub, fontWeight: 700 }}>{progress.xpForNextLevel - progress.xpIntoLevel} XP</b>
            </>
          )}
        </span>
      </div>

      <div style={{ height: 7, borderRadius: radius.pill, background: colors.track, overflow: 'hidden' }}>
        <ProgressBarFill percent={percent} color={colors.primary} />
      </div>

      <div style={{ display: 'flex', marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
        <StatusStat label="오늘 획득" value={todayXp === null ? '-' : `+${todayXp} XP`} />
        <StatusStat
          label="주간 퀘스트"
          value={weeklyClaimed === null ? '-' : `${weeklyClaimed} / ${weeklyTotal}`}
          onClick={() => navigate('/profile/quests')}
        />
        <StatusStat label="배지" value={badgeCount === null ? '-' : `${badgeCount} / ${BADGES.length}`} onClick={() => navigate('/profile/badges')} />
      </div>
    </Card>
  )
}

function StatusStat({ label, value, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={onClick ? 'tds-press' : undefined}
      style={{
        flex: 1,
        textAlign: 'center',
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
      }}
    >
      <p style={{ margin: 0, fontSize: 11.5, color: colors.textSub }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14.5, fontWeight: 700, color: colors.textStrong }}>{value}</p>
    </Tag>
  )
}
