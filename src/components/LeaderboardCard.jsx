import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import Spinner from './Spinner.jsx'
import { getDailyLeaderboard } from '../lib/leaderboard.js'
import { calcNutritionScore } from '../lib/nutritionScore.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 게스트는 기기 하나에 묶인 임시 식별자뿐이라 다른 사람과 비교할 고정된 신원이 없다 — 그래서 순위 비교는
// 로그인 계정끼리만 하고, 게스트에게는 "오늘의 점수"(자기 자신의 점수)만 보여주며 로그인을 안내한다.
export default function LeaderboardCard() {
  const { authMode, todayMealsTotal, effectiveRecommended } = useUser()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
  }, [authMode])

  const myScore = calcNutritionScore(todayMealsTotal, effectiveRecommended)

  if (authMode !== 'user') {
    return (
      <Card>
        <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>오늘의 점수</h2>
        {myScore === null ? (
          <p style={{ color: colors.textSub, fontSize: font.size.sm, margin: `0 0 ${spacing.sm}px` }}>
            신체정보를 입력하고 식사를 기록하면 오늘의 점수를 볼 수 있어요.
          </p>
        ) : (
          <p style={{ fontSize: 32, fontWeight: 800, color: colors.primary, margin: `0 0 ${spacing.sm}px` }}>{myScore}점</p>
        )}
        <p style={{ color: colors.muted, fontSize: font.size.xs, margin: 0 }}>
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
            return (
              <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textSub }}>
                {me ? (
                  <>
                    내 순위: <strong style={{ color: colors.primary }}>{me.rank}위</strong> / {rows.length}명 중 · {me.score}점
                  </>
                ) : (
                  '아직 오늘 식사를 기록하지 않아 순위에 없어요.'
                )}
              </p>
            )
          })()}
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
