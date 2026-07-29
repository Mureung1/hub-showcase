import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import ChevronIcon from './ChevronIcon.jsx'
import Spinner from './Spinner.jsx'
import XpLeaderboardModal from './XpLeaderboardModal.jsx'
import { getXpLeaderboard } from '../lib/xpLeaderboard.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// MY 탭 — 레벨 카드 바로 아래, 퀘스트 게시판 위에 위치(FR-15). "내 순위" 한 줄 요약만 보여주고,
// 터치하면 XpLeaderboardModal로 전체 리더보드(듀오링고 스타일)를 연다. 게스트는 기기 하나에 묶인
// 임시 식별자뿐이라 다른 사람과 비교할 고정된 신원이 없다 — LeaderboardCard.jsx(오늘의 순위)와 동일한
// 이유로 로그인 유도만 보여준다.
export default function LeaderboardSummaryCard() {
  const { authMode } = useUser()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (authMode !== 'user') return
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
      <Card>
        <h3 style={{ margin: `0 0 ${spacing.xs}px`, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>
          리더보드
        </h3>
        <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
          로그인하면 다른 사용자와 레벨·경험치로 경쟁할 수 있어요.
        </p>
      </Card>
    )
  }

  const me = rows?.find((r) => r.isMe)

  return (
    <>
      <button
        type="button"
        className="tds-press"
        onClick={() => setOpen(true)}
        disabled={!rows && !error}
        style={{ width: '100%', border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
      >
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <div>
              <h3 style={{ margin: `0 0 ${spacing.xs}px`, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>
                리더보드
              </h3>
              {error ? (
                <p style={{ ...styles.errorText, margin: 0 }}>{error}</p>
              ) : !rows ? (
                <Spinner size={16} />
              ) : me ? (
                <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
                  내 순위 <strong style={{ color: colors.primary }}>{me.rank}위</strong> · Lv.{me.level}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
                  {rows.length > 0 ? `${rows.length}명이 경쟁 중이에요` : '아직 아무도 없어요'}
                </p>
              )}
            </div>
            <ChevronIcon open={false} />
          </div>
        </Card>
      </button>

      {open && <XpLeaderboardModal rows={rows ?? []} onClose={() => setOpen(false)} />}
    </>
  )
}
