import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import ProgressBarFill from './ProgressBarFill.jsx'
import { getLevelState } from '../lib/dataStore.js'
import { getLevelProgress } from '../lib/levelSystem.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭 — 듀오링고식 레벨/경험치(FR-11). 저장은 total_xp 하나뿐이고(dataStore.getLevelState), 레벨/
// 진행률은 항상 levelSystem.getLevelProgress로 다시 계산한다. QuestBoard가 XP를 지급한 뒤에도 이
// 컴포넌트를 새로 마운트하면(effectiveUserId 변경 등) 최신 값을 다시 읽어온다 — 실시간 갱신은
// Analyze.jsx의 홈 화면 애니메이션(FR-12) 쪽 책임이고, 이 카드는 방문할 때마다 정확한 값을 보여주면
// 된다.
export default function LevelCard() {
  const { effectiveUserId } = useUser()
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    let cancelled = false
    getLevelState()
      .then(({ totalXp }) => {
        if (!cancelled) setProgress(getLevelProgress(totalXp))
      })
      .catch(() => {
        if (!cancelled) setProgress(getLevelProgress(0))
      })
    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  if (!progress) return null

  const percent = progress.isMaxLevel ? 100 : (progress.xpIntoLevel / progress.xpForNextLevel) * 100

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <h3 style={{ margin: 0, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>Lv.{progress.level}</h3>
        <span style={{ fontSize: font.size.xs, color: colors.textSub }}>
          {progress.isMaxLevel ? '만렙을 달성했어요!' : `다음 레벨까지 ${progress.xpForNextLevel - progress.xpIntoLevel} XP`}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: radius.pill, background: colors.bg, overflow: 'hidden' }}>
        <ProgressBarFill percent={percent} color={colors.primary} />
      </div>
    </Card>
  )
}
