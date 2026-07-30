import ProgressBarFill from './ProgressBarFill.jsx'
import { getLevelProgress } from '../lib/levelSystem.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 홈 화면(Analyze.jsx) 상시 노출 — 순수 프레젠테이션 컴포넌트(자체 fetch 없음). totalXp는 부모가
// 들고 있는 state를 그대로 받는다 — 끼니 저장 직후 XP 지급의 정확한 전/후 값을 아는 쪽이 부모이기
// 때문이다(FR-12 트리거 흐름 참고). id="home-level-pill"은 xpFlyAnimation.js가 애니메이션 목적지
// 좌표를 구하는 데 쓴다.
export default function LevelPill({ totalXp }) {
  const progress = getLevelProgress(totalXp)
  const percent = progress.isMaxLevel ? 100 : (progress.xpIntoLevel / progress.xpForNextLevel) * 100

  return (
    <div
      id="home-level-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: '4px 10px',
        borderRadius: radius.pill,
        background: colors.primarySurface,
        marginBottom: spacing.sm,
      }}
    >
      <span style={{ fontSize: font.size.xs, fontWeight: 800, color: colors.primary, whiteSpace: 'nowrap' }}>
        Lv.{progress.level}
      </span>
      <div style={{ width: 48, height: 5, borderRadius: radius.pill, background: colors.bg, overflow: 'hidden' }}>
        <ProgressBarFill percent={percent} color={colors.primary} />
      </div>
    </div>
  )
}
