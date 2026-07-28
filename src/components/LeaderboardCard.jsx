import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import ChevronIcon from './ChevronIcon.jsx'
import Spinner from './Spinner.jsx'
import { getDailyLeaderboard } from '../lib/leaderboard.js'
import { calcScore, getScoreBreakdown } from '../lib/nutritionScore.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const STATUS_META = {
  good: { icon: '✅', color: colors.satisfied, surface: colors.satisfiedSurface },
  warn: { icon: '⚠️', color: colors.deficient, surface: colors.deficientSurface },
  bad: { icon: '⛔', color: colors.danger, surface: colors.dangerSurface },
}

function ScoreBreakdownRow({ row }) {
  const meta = STATUS_META[row.status]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: `${spacing.sm}px 0`,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: radius.pill,
          background: meta.surface,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
        }}
      >
        {meta.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.sm }}>
          <span style={{ fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>{row.label}</span>
          <span style={{ fontSize: font.size.sm, fontWeight: 700, color: meta.color, whiteSpace: 'nowrap' }}>
            {row.points}/{row.maxPoints}
          </span>
        </div>
        <p style={{ margin: '2px 0 0', fontSize: font.size.xs, color: colors.textSub }}>{row.criterion}</p>
      </div>
    </div>
  )
}

function ScoreBreakdownPanel({ actual, target }) {
  const rows = getScoreBreakdown(actual, target)
  if (rows.length === 0) return null
  return <div style={{ marginTop: spacing.sm }}>{rows.map((row) => <ScoreBreakdownRow key={row.key} row={row} />)}</div>
}

// 게스트는 기기 하나에 묶인 임시 식별자뿐이라 다른 사람과 비교할 고정된 신원이 없다 — 그래서 순위 비교는
// 로그인 계정끼리만 하고, 게스트에게는 "오늘의 점수"(자기 자신의 점수)만 보여주며 로그인을 안내한다.
export default function LeaderboardCard() {
  const { authMode, todayMealsTotal, effectiveRecommended } = useUser()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  // authMode뿐 아니라 오늘 섭취 합계(todayMealsTotal)가 바뀔 때도 다시 불러온다 — 같은 식단 탭에서 끼니를
  // 추가/삭제하면 내 점수·순위가 바뀌는데, authMode만 의존하면 탭을 다시 열기 전까지 옛 순위가 남는다.
  useEffect(() => {
    if (authMode !== 'user') return
    let cancelled = false
    setLoading(true)
    setError('')
    getDailyLeaderboard()
      .then((result) => {
        if (!cancelled) setRows(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '순위를 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authMode, todayMealsTotal])

  const myScore = calcScore(todayMealsTotal, effectiveRecommended)

  if (authMode !== 'user') {
    return (
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <button
          type="button"
          className="tds-press"
          onClick={() => myScore !== null && setBreakdownOpen((v) => !v)}
          aria-expanded={breakdownOpen}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            background: 'none',
            border: 'none',
            padding: spacing.xl,
            paddingBottom: myScore === null ? spacing.md : spacing.xl,
            cursor: myScore === null ? 'default' : 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>오늘의 점수</h2>
            {myScore === null ? (
              <p style={{ color: colors.textSub, fontSize: font.size.sm, margin: 0 }}>
                신체정보를 입력하고 식사를 기록하면 오늘의 점수를 볼 수 있어요.
              </p>
            ) : (
              <p style={{ fontSize: 32, fontWeight: 800, color: colors.primary, margin: 0 }}>{myScore}점</p>
            )}
          </div>
          {myScore !== null && (
            <span style={{ color: colors.muted, flexShrink: 0 }}>
              <ChevronIcon open={breakdownOpen} />
            </span>
          )}
        </button>
        {breakdownOpen && myScore !== null && (
          <div style={{ padding: `0 ${spacing.xl}px ${spacing.md}px` }}>
            <ScoreBreakdownPanel actual={todayMealsTotal} target={effectiveRecommended} />
          </div>
        )}
        <p style={{ color: colors.muted, fontSize: font.size.xs, margin: `0 ${spacing.xl}px`, paddingBottom: spacing.xl }}>
          로그인하면 다른 사용자와 오늘의 순위를 비교할 수 있어요.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.md}px`, color: colors.textStrong }}>오늘의 순위</h2>
      {loading ? (
        <Spinner size={20} />
      ) : error ? (
        <p style={styles.errorText}>{error}</p>
      ) : !rows || rows.length === 0 ? (
        <p style={{ color: colors.textSub, fontSize: font.size.sm }}>아직 오늘 기록한 사용자가 없어요.</p>
      ) : (
        <>
          {(() => {
            const me = rows.find((row) => row.isMe)
            if (!me) {
              return (
                <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textSub }}>
                  아직 오늘 식사를 기록하지 않아 순위에 없어요.
                </p>
              )
            }
            return (
              <button
                type="button"
                className="tds-press"
                onClick={() => setBreakdownOpen((v) => !v)}
                aria-expanded={breakdownOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                  background: colors.bg,
                  border: 'none',
                  borderRadius: radius.sm,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: font.size.sm, color: colors.textSub }}>
                  내 순위: <strong style={{ color: colors.primary }}>{me.rank}위</strong> / {rows.length}명 중 · {me.score}점
                </span>
                <ChevronIcon open={breakdownOpen} />
              </button>
            )
          })()}
          {breakdownOpen && rows.some((r) => r.isMe) && (
            <div style={{ marginBottom: spacing.md }}>
              <ScoreBreakdownPanel actual={todayMealsTotal} target={effectiveRecommended} />
            </div>
          )}
          {rows.slice(0, 10).map((row) => (
            <div
              key={row.rank}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                fontWeight: row.isMe ? 700 : 400,
                color: row.isMe ? colors.primary : colors.textStrong,
              }}
            >
              <span>
                {row.rank}위{row.isMe ? ' (나)' : ''}
              </span>
              <span>{row.score}점</span>
            </div>
          ))}
        </>
      )}
    </Card>
  )
}
