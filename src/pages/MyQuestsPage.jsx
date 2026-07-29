import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ProgressBarFill from '../components/ProgressBarFill.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getXpEarnedInRange } from '../lib/dataStore.js'
import { logicalWeekKey } from '../lib/logicalDate.js'
import { weekDateKeys } from '../lib/questWeekContext.js'
import { useQuestBoard } from '../lib/useQuestBoard.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// MY 탭 개편 — 예전 QuestBoard.jsx(MY 탭에 임베드된 카드)를 전용 화면으로 승격했다. 조회/자동클레임
// 로직은 그대로 useQuestBoard.js를 공유하고, 이 화면만의 추가 요소는: (1) 상단 "이번 주 획득 XP" 카드
// (dataStore.getXpEarnedInRange, 새 SQL 없이 quest_claims 기존 컬럼만으로 계산), (2) 이번 주 퀘스트
// 항목마다 숫자 진행률 바(quests.js의 progressOf가 계산한 quest.progress).
export default function MyQuestsPage() {
  const navigate = useNavigate()
  const { levelProgress } = useUser()
  const { board, error, refresh } = useQuestBoard({ weeklyCount: 5 })
  const [weekXp, setWeekXp] = useState(null)

  useEffect(() => {
    let cancelled = false
    const dates = weekDateKeys(logicalWeekKey(new Date()))
    getXpEarnedInRange(dates[0], dates[dates.length - 1])
      .then((xp) => {
        if (!cancelled) setWeekXp(xp)
      })
      .catch(() => {
        if (!cancelled) setWeekXp(0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={styles.page}>
      <ScreenHeader title="퀘스트" onBack={() => navigate('/profile')} />

      {levelProgress && (
        <Card style={{ background: colors.primary, boxShadow: 'none', marginBottom: spacing.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
            <div>
              <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>이번 주 획득 XP</p>
              <p style={{ margin: '2px 0 0', fontSize: font.size.xxl, fontWeight: 800, color: '#fff' }}>
                {weekXp === null ? '-' : weekXp} XP
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>다음 레벨까지</p>
              <p style={{ margin: '2px 0 0', fontSize: font.size.md, fontWeight: 700, color: '#fff' }}>
                {levelProgress.isMaxLevel ? '만렙 달성!' : `${levelProgress.xpForNextLevel - levelProgress.xpIntoLevel} XP`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {error ? (
        // useQuestBoard.js — 조회가 실패하면 board는 null로 남고 loading도 계속 true라, error를 먼저
        // 확인하지 않으면 이 화면이 스켈레톤을 영원히 보여준다(리뷰에서 발견). 재시도 버튼으로 복구한다.
        <Card style={{ textAlign: 'center' }}>
          <p style={{ ...styles.errorText, margin: `0 0 ${spacing.md}px` }}>퀘스트를 불러오지 못했어요.</p>
          <AppButton variant="secondary" onClick={refresh}>
            다시 시도
          </AppButton>
        </Card>
      ) : !board ? (
        <Card>
          <Skeleton height={16} width="40%" style={{ marginBottom: spacing.sm }} />
          <Skeleton height={60} />
        </Card>
      ) : (
        <Card>
          <QuestSection title="오늘의 퀘스트" quests={board.daily} allClear={board.dailyAllClear} allClearText="오늘의 퀘스트를 모두 완료했어요!" />
          <div style={{ marginTop: spacing.lg }}>
            <QuestSection title="이번 주 퀘스트" quests={board.weekly} allClear={board.weeklyAllClear} allClearText="이번 주 퀘스트를 모두 완료했어요!" />
          </div>
        </Card>
      )}
    </div>
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
          <div key={quest.id} style={{ padding: `${spacing.sm}px 0`, borderTop: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>
                  {quest.title} <span style={{ color: colors.primary, fontWeight: 700 }}>+{quest.xp}XP</span>
                </p>
                <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub }}>{quest.description}</p>
              </div>
              {quest.claimed ? (
                <span style={{ fontSize: font.size.xs, color: colors.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>완료 ✓</span>
              ) : (
                !quest.progress && <span style={{ fontSize: font.size.xs, color: colors.muted, whiteSpace: 'nowrap' }}>진행 중</span>
              )}
            </div>

            {!quest.claimed && quest.progress && (
              <div style={{ marginTop: spacing.xs }}>
                <div style={{ height: 6, borderRadius: radius.pill, background: colors.track, overflow: 'hidden' }}>
                  <ProgressBarFill percent={(quest.progress.current / quest.progress.target) * 100} color={colors.primary} />
                </div>
                <p style={{ margin: `2px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
                  {quest.progress.current}/{quest.progress.target}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
