import { colors, font, radius, spacing } from '../styles/theme.js'

// 리텐션 강화 v4 — 리더보드 모달 상단 1/2/3등 시상대. top3: rank 1~3 순서의 3개 행
// ({rank,nickname,totalXp,level,isMe}) — xpLeaderboard.js의 getXpLeaderboard()가 rank를 항상
// row_number()(1부터 연속)로 매기므로, 배열 위치와 rank가 항상 일치한다. 화면엔 듀오링고식으로
// 2등-1등-3등 순서(1등이 가운데·가장 높게)로 재배치해 보여준다.
const PODIUM_ORDER = [2, 1, 3]
const PODIUM_HEIGHT = { 1: 120, 2: 96, 3: 80 }
const PODIUM_MEDAL = { 1: '👑', 2: '🥈', 3: '🥉' }

export default function LeaderboardPodium({ top3 }) {
  const byRank = new Map((top3 ?? []).map((row) => [row.rank, row]))

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm, margin: `0 0 ${spacing.lg}px` }}>
      {PODIUM_ORDER.map((rank, i) => {
        const row = byRank.get(rank)
        if (!row) return null
        return (
          <div
            key={row.rank}
            className="tds-podium-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              maxWidth: 112,
              minWidth: 0,
              animationDelay: `${i * 80}ms`,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: rank === 1 ? 26 : 20 }}>
              {PODIUM_MEDAL[rank]}
            </span>
            <p
              style={{
                margin: `${spacing.xs}px 0 0`,
                fontSize: font.size.sm,
                fontWeight: 800,
                color: row.isMe ? colors.primary : colors.textStrong,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {row.nickname}
              {row.isMe && ' (나)'}
            </p>
            <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub, whiteSpace: 'nowrap' }}>
              Lv.{row.level} · {row.totalXp}XP
            </p>
            <div
              style={{
                marginTop: spacing.xs,
                width: '100%',
                height: PODIUM_HEIGHT[rank],
                borderRadius: `${radius.md}px ${radius.md}px 0 0`,
                background: rank === 1 ? colors.primary : colors.primarySurface,
                border: row.isMe && rank !== 1 ? `2px solid ${colors.primary}` : 'none',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
                paddingTop: spacing.sm,
              }}
            >
              <span style={{ fontSize: font.size.lg, fontWeight: 800, color: rank === 1 ? '#fff' : colors.primary }}>{rank}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
