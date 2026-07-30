import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppButton from '../components/AppButton.jsx'
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
  const { authMode, authLoading } = useUser()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  // 조회 실패 시 사용자가 직접 다시 시도할 수단. 없으면 RPC가 한 번만 실패해도 **새로고침 말고는
  // 복구할 방법이 없다** — 데모 전날 실측된 "리더보드가 가끔 안 뜨는데 새로고침하면 나온다"의 절반이
  // 이것이었다(나머지 절반은 토큰 갱신 레이스, supabaseRpc.js 참고).
  // LeaderboardCard가 이미 같은 패턴(reloadTick)을 쓰는데 이 화면에만 빠져 있었다.
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (authMode !== 'user') return undefined
    let cancelled = false
    setError('')
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
  }, [authMode, reloadTick])

  // ⚠️ 세션 복원이 끝나기 전에는 authMode가 'guest'다 — 그대로 아래 분기를 타면 로그인한 사용자에게
  // "로그인하면 경쟁할 수 있어요"가 잠깐(느린 회선에서는 꽤 길게) 보인다. 로딩과 게스트는 다른 상태다.
  if (authLoading) {
    return (
      <div style={styles.page}>
        <ScreenHeader title="리더보드" onBack={() => navigate('/profile')} />
        <Card>
          <Skeleton height={60} />
        </Card>
      </div>
    )
  }

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
          <AppButton
            variant="secondary"
            onClick={() => {
              setRows(null)
              setReloadTick((t) => t + 1)
            }}
            style={{ marginTop: spacing.sm }}
          >
            다시 시도
          </AppButton>
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

      {/* XP가 0이면 SQL(get_xp_leaderboard)의 `where total_xp > 0`에 걸려 결과에서 아예 빠진다 —
          즉 rows는 정상인데 me만 없다. 이 안내가 없을 때는 갓 가입한 사용자가 남의 포디움만 덩그러니
          보게 되어 "리더보드가 제대로 안 뜬다"로 읽혔다(실제 신고). 조회 실패와 구분돼야 하는 상태다.
          식단 탭 LeaderboardCard는 같은 상황("오늘 기록 없음")을 이미 이렇게 안내하고 있었다. */}
      {rows && rows.length > 0 && !me && (
        <Card style={{ marginBottom: spacing.lg }}>
          <p style={{ margin: 0, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>아직 순위에 없어요</p>
          <p style={{ margin: `${spacing.xs}px 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textSub }}>
            퀘스트를 완료해 XP를 얻으면 리더보드에 올라가요.
          </p>
          <AppButton variant="secondary" onClick={() => navigate('/profile/quests')}>
            퀘스트 보러 가기
          </AppButton>
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
