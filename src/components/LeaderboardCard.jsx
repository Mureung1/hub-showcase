import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import ChevronIcon from './ChevronIcon.jsx'
import Spinner from './Spinner.jsx'
import { getDailyLeaderboard } from '../lib/leaderboard.js'
import { getScoreBreakdown } from '../lib/nutritionScore.js'
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
// 로그인 계정끼리만 한다. 예전엔 게스트에게 이 카드가 "오늘의 점수"(자기 자신의 점수)를 큰 숫자로 한
// 번 더 보여줬는데, 식단 탭 개편(리텐션 강화 v7)으로 화면 맨 위 TodayScoreSummary가 이미 같은
// calcScore 값을 링으로 보여주므로 여기서는 로그인 유도만 하고 점수 중복 표시는 뺐다(판단 근거는
// 통합 PRD 3절 참고).
export default function LeaderboardCard() {
  const { authMode, todayMealsTotal, effectiveRecommended } = useUser()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  // 조회 실패 시 재시도 버튼이 누르는 트리거 — 끼니 변화 없이도 같은 조회를 다시 돌게 한다
  // (Calendar.jsx의 monthReloadTick/retryMonth와 동일한 패턴, 리뷰에서 발견: 예전엔 재시도 수단이
  // 없어 사용자가 복구하려면 끼니를 추가/삭제해 todayMealsTotal을 바꾸는 우회밖에 없었다).
  const [reloadTick, setReloadTick] = useState(0)

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
  }, [authMode, todayMealsTotal, reloadTick])

  if (authMode !== 'user') {
    return (
      <Card>
        <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>다른 사용자와 비교</h2>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
          로그인하면 다른 사용자와 오늘의 순위를 비교할 수 있어요.
        </p>
        <Link to="/login" className="tds-press" style={{ ...styles.buttonSecondary, display: 'inline-block', textDecoration: 'none' }}>
          로그인 / 회원가입
        </Link>
      </Card>
    )
  }

  return (
    <Card>
      <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.md}px`, color: colors.textStrong }}>오늘의 순위</h2>
      {loading ? (
        <Spinner size={20} />
      ) : error ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ ...styles.errorText, margin: `0 0 ${spacing.md}px` }}>{error}</p>
          <AppButton variant="secondary" onClick={() => setReloadTick((t) => t + 1)}>
            다시 시도
          </AppButton>
        </div>
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
