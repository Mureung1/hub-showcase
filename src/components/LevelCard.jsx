import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import ProgressBarFill from './ProgressBarFill.jsx'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭 — 듀오링고식 레벨/경험치(FR-11). totalXp/레벨 진행률은 UserContext(리텐션 강화 v4에서 중앙화)
// 가 앱 전체와 공유하는 단일 소스라, 어느 화면(홈의 runGamification, MY 탭 QuestBoard의 자동 클레임
// 등)에서 XP를 얻든 이 카드도 재렌더와 동시에 즉시 반영된다 — 예전처럼 마운트 시점에만 따로 값을
// 읽어오지 않는다. id="my-level-pill"은 xpFlyAnimation.js의 findLevelPillRect가 MY 탭에서 일어난
// 클레임의 애니메이션 목적지 좌표를 구하는 데 쓴다(홈 화면의 id="home-level-pill"과 같은 역할).
export default function LevelCard() {
  const { levelProgress: progress } = useUser()

  if (!progress) return null

  const percent = progress.isMaxLevel ? 100 : (progress.xpIntoLevel / progress.xpForNextLevel) * 100

  return (
    <Card>
      <div id="my-level-pill" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm }}>
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
