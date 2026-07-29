import { useNavigate } from 'react-router-dom'
import Card from './Card.jsx'
import { colors, font, spacing } from '../styles/theme.js'

// MY 탭 개편 — "오늘의 퀘스트" 위젯(요약본). questBoard는 Profile.jsx가 이미 useQuestBoard로 불러온
// 걸 그대로 받는다(autoClaim:false — 실제 클레임은 여전히 끼니 저장 직후 Analyze.jsx의 runGamification
// 또는 /profile/quests 화면 하나로만 일어난다, 같은 화면에 자동클레임 훅이 여럿 뜨는 걸 피하기 위해).
// 카드를 누르면 전체 목록·주간 퀘스트가 있는 /profile/quests로 이동한다.
export default function MyDailyQuestWidget({ questBoard }) {
  const navigate = useNavigate()
  const quests = questBoard?.daily ?? []
  const claimedCount = quests.filter((q) => q.claimed).length
  const earnedXp = quests.filter((q) => q.claimed).reduce((sum, q) => sum + q.xp, 0)

  return (
    <Card onClick={() => navigate('/profile/quests')} style={{ height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <h3 style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>오늘의 퀘스트</h3>
        <span style={{ fontSize: font.size.xs, fontWeight: 700, color: colors.primary }}>
          {quests.length === 0 ? '-' : `${claimedCount}/${quests.length}`}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, marginBottom: spacing.sm }}>
        {quests.map((quest) => (
          <div key={quest.id} style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <span
              aria-hidden="true"
              style={{ width: 6, height: 6, borderRadius: '50%', background: quest.claimed ? colors.primary : colors.border, flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: font.size.xs,
                color: quest.claimed ? colors.textStrong : colors.textSub,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {quest.title}
            </span>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub }}>
        {questBoard?.dailyAllClear ? `모두 완료 · +${earnedXp}XP` : '진행 중'}
      </p>
    </Card>
  )
}
