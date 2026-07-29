import Card from './Card.jsx'
import { useQuestBoard } from '../lib/useQuestBoard.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭 — 퀘스트 게시판(FR-11, 일간/주간 로테이션 FR-16). 오늘의 미션(예전 missions.js — 리텐션
// 강화 v4에서 홈 화면 HomeQuestCard와 시스템을 통합하며 제거됨)과 달리 일간 3개+주간 5개를 동시에
// 보여주고, 완료(수령)를 dataStore.claimQuest로 영구 저장한다. 조회+자동클레임 로직은
// useQuestBoard.js(HomeQuestCard.jsx와 공유)에 있다 — 모든 퀘스트가 자동 판정+자동 수령이라(FR-16에서
// 수동 클레임 버튼 제거) 마운트 시 이 훅이 조건을 만족한 퀘스트를 조용히 수령하는 것이 유일한 지급
// 경로 중 하나다(다른 하나는 끼니 저장 직후 Analyze.jsx의 runGamification — 애니메이션과 함께 지급,
// 둘 다 UserContext.jsx의 claimQuestsAndCelebrate를 공유해 어느 쪽이든 XP 반영/애니메이션이 즉시 보인다).
export default function QuestBoard() {
  const { board } = useQuestBoard({ weeklyCount: 5 })

  if (!board) return null

  return (
    <Card>
      <QuestSection title="오늘의 퀘스트" quests={board.daily} allClear={board.dailyAllClear} allClearText="오늘의 퀘스트를 모두 완료했어요!" />
      <div style={{ marginTop: spacing.lg }}>
        <QuestSection title="이번 주 퀘스트" quests={board.weekly} allClear={board.weeklyAllClear} allClearText="이번 주 퀘스트를 모두 완료했어요!" />
      </div>
    </Card>
  )
}

function QuestSection({ title, quests, allClear, allClearText }) {
  return (
    <div>
      <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>{title}</h3>
      {allClear && (
        <p
          style={{
            margin: `0 0 ${spacing.sm}px`,
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderRadius: radius.pill,
            background: colors.primarySurface,
            color: colors.primary,
            fontSize: font.size.xs,
            fontWeight: 700,
          }}
        >
          🎉 {allClearText}
        </p>
      )}
      <div>
        {quests.map((quest) => (
          <div
            key={quest.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
              padding: `${spacing.sm}px 0`,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>
                {quest.title} <span style={{ color: colors.primary, fontWeight: 700 }}>+{quest.xp}XP</span>
              </p>
              <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub }}>{quest.description}</p>
            </div>
            {quest.claimed ? (
              <span style={{ fontSize: font.size.xs, color: colors.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>완료 ✓</span>
            ) : (
              <span style={{ fontSize: font.size.xs, color: colors.muted, whiteSpace: 'nowrap' }}>진행 중</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
