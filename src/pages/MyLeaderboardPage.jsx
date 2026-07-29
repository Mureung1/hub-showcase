import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import LeaderboardPodium from '../components/LeaderboardPodium.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useUser } from '../context/UserContext.jsx'
import { windowAroundMe } from '../lib/leaderboardWindow.js'
import { getXpLeaderboard } from '../lib/xpLeaderboard.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const WINDOW_RADIUS = 2

// MY 탭 개편 — 예전엔 LeaderboardSummaryCard(MY 탭 위젯) → XpLeaderboardModal(바텀시트, 전체 목록)
// 구조였다. 이제 그리드 아이콘이 이 전용 화면으로 바로 이동하고, 목록도 "상위 3명 + 내 순위 주변"만
// 보여준다(사용자 확인 — "이번 주/전체" 토글·"어제보다" 순위 변화·매주 리셋 문구는 새 SQL이 필요해
// 이번 범위에서 뺐다. 상위 %는 이미 받은 전체 목록 길이로 클라이언트에서 바로 계산 가능해 포함했다).
export default function MyLeaderboardPage() {
  const navigate = useNavigate()
  const { authMode } = useUser()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authMode !== 'user') return undefined
    let cancelled = false
    getXpLeaderboard()
      .then((result) => {
        if (!cancelled) setRows(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '리더보드를 불러오지 못했어요.')
      })
    return () => {
      cancelled = true
    }
  }, [authMode])

  if (authMode !== 'user') {
    return (
      <div style={styles.page}>
        <ScreenHeader title="리더보드" onBack={() => navigate('/profile')} />
        <Card>
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
            로그인하면 다른 사용자와 레벨·경험치로 경쟁할 수 있어요.
          </p>
        </Card>
      </div>
    )
  }

  const me = rows?.find((r) => r.isMe)
  const hasPodium = (rows?.length ?? 0) >= 3
  const nearbyRows = rows && me ? windowAroundMe(rows, me.rank, WINDOW_RADIUS).filter((r) => r.rank > 3) : []

  return (
    <div style={styles.page}>
      <ScreenHeader title="리더보드" onBack={() => navigate('/profile')} />

      {error && (
        <Card>
          <p style={styles.errorText}>{error}</p>
        </Card>
      )}

      {!rows && !error && (
        <Card>
          <Skeleton height={60} />
        </Card>
      )}

      {rows && rows.length === 0 && (
        <Card>
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>아직 리더보드에 아무도 없어요.</p>
        </Card>
      )}

      {rows && me && (
        <Card style={{ marginBottom: spacing.lg }}>
          <p style={{ margin: 0, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>
            내 순위 <span style={{ color: colors.primary }}>{me.rank}위</span> · Lv.{me.level}
          </p>
          <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.sm, color: colors.textSub }}>
            상위 {Math.max(1, Math.round((me.rank / rows.length) * 100))}% · 전체 누적 기준
          </p>
        </Card>
      )}

      {hasPodium && <LeaderboardPodium top3={rows.slice(0, 3)} />}

      {hasPodium && nearbyRows.length > 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>내 순위 주변</h3>
          {nearbyRows.map((row, i) => (
            <LeaderboardRow key={row.rank} row={row} isFirst={i === 0} />
          ))}
        </Card>
      )}

      {!hasPodium && rows && rows.length > 0 && (
        <Card>
          {rows.map((row, i) => (
            <LeaderboardRow key={row.rank} row={row} isFirst={i === 0} />
          ))}
        </Card>
      )}
    </div>
  )
}

function LeaderboardRow({ row, isFirst }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.sm}px 0`,
        borderTop: isFirst ? 'none' : `1px solid ${colors.border}`,
        background: row.isMe ? colors.primarySurface : 'transparent',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          fontSize: font.size.sm,
          fontWeight: row.isMe ? 700 : 400,
          color: row.isMe ? colors.primary : colors.textStrong,
        }}
      >
        <span style={{ width: 32, textAlign: 'center' }}>{MEDAL[row.rank] ?? `${row.rank}위`}</span>
        <span>
          {row.nickname}
          {row.isMe && ' (나)'}
        </span>
      </span>
      <span style={{ fontSize: font.size.xs, color: colors.textSub, whiteSpace: 'nowrap' }}>
        Lv.{row.level} · {row.totalXp}XP
      </span>
    </div>
  )
}
