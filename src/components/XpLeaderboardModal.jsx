import { useFocusTrap } from '../lib/useFocusTrap.js'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

// 듀오링고 스타일 전체 XP 리더보드(FR-15) — ConfirmDialog.jsx와 동일한 시트 셸을 재사용한다.
// rows: xpLeaderboard.js의 getXpLeaderboard() 결과(rank/nickname/totalXp/level/isMe), 상위 3명은
// 메달 아이콘으로, 내 행은 배경색으로 강조한다.
export default function XpLeaderboardModal({ rows, onClose }) {
  const containerRef = useFocusTrap(true, onClose)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="xp-leaderboard-title"
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
      onClick={onClose}
    >
      <div
        className="tds-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: colors.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: spacing.xl,
          marginBottom: `calc(${spacing.xl}px + env(safe-area-inset-bottom))`,
          boxSizing: 'border-box',
        }}
      >
        <h3 id="xp-leaderboard-title" style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.lg, color: colors.textStrong }}>
          리더보드
        </h3>

        {rows.length === 0 ? (
          <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm }}>아직 리더보드에 아무도 없어요.</p>
        ) : (
          <div>
            {rows.map((row, i) => (
              <div
                key={row.rank}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${spacing.sm}px`,
                  borderTop: i === 0 ? 'none' : `1px solid ${colors.border}`,
                  background: row.isMe ? colors.primarySurface : 'transparent',
                  borderRadius: row.isMe ? radius.sm : 0,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    fontSize: font.size.sm,
                    fontWeight: row.rank <= 3 ? 800 : row.isMe ? 700 : 400,
                    color: row.isMe ? colors.primary : colors.textStrong,
                  }}
                >
                  <span style={{ width: 28, textAlign: 'center' }}>{MEDAL[row.rank] ?? `${row.rank}위`}</span>
                  {row.nickname}
                  {row.isMe && ' (나)'}
                </span>
                <span style={{ fontSize: font.size.xs, color: colors.textSub, whiteSpace: 'nowrap' }}>
                  Lv.{row.level} · {row.totalXp}XP
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="tds-press"
          onClick={onClose}
          style={{
            display: 'block',
            margin: `${spacing.lg}px auto 0`,
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
