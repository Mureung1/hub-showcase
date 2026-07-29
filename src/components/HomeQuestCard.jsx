import { useEffect, useState } from 'react'
import Card from './Card.jsx'
import Skeleton from './Skeleton.jsx'
import { useQuestBoard } from '../lib/useQuestBoard.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

const ROTATE_MS = 10000

// 완료 여부를 보여주는 원형 체크마크(예전 DailyMissionCard의 시각을 그대로 재사용).
function QuestCheckMark({ completed }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: completed ? colors.primary : colors.bg,
        border: completed ? 'none' : `1.5px solid ${colors.border}`,
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {completed ? '✓' : ''}
    </div>
  )
}

// 홈 최상단의 "오늘의 미션" 카드 자리를 대체한다(리텐션 강화 v4) — 예전엔 홈 화면 미션(부족 영양소
// 기반 하루 1개, 이력 없음)과 MY 탭 퀘스트(quests.js)가 서로 다른 시스템이라 내용이 어긋났다. 이제
// MY 탭 "오늘의 퀘스트" 3개와 완전히 같은 데이터(useQuestBoard.js 공유)를 10초 간격으로 하나씩 순환해
// 보여준다. autoClaim: false — 실제 클레임은 끼니 저장 직후 Analyze.jsx의 runGamification 한 경로로만
// 일어나고 이 카드는 조회만 한다(같은 화면에 두 훅 인스턴스가 동시에 자동클레임하면 게스트 쪽에서
// 중복 지급될 수 있어서 — useQuestBoard.js 헤더 주석 참고).
//
// 리텐션 강화 v5 — "완료한 퀘스트가 로테이션에 남아 있다"는 피드백에 따라 claimed(수령 완료)된
// 퀘스트는 순환 목록에서 아예 제외한다. 남은 미완료 퀘스트가 없으면(dailyAllClear) 순환 대신 축하
// 카드 하나만 보여준다 — 카드가 아무 설명 없이 사라지면 버그처럼 보이기 때문.
export default function HomeQuestCard() {
  const { board, loading } = useQuestBoard({ autoClaim: false })
  const [index, setIndex] = useState(0)
  const quests = (board?.daily ?? []).filter((q) => !q.claimed)

  // 로테이션이 바뀌면(퀘스트 완료로 목록이 줄어듦, 자정 넘김, 로그인 전환 등) 항상 첫 번째 퀘스트부터 다시 보여준다.
  useEffect(() => {
    setIndex(0)
  }, [quests.length])

  useEffect(() => {
    if (quests.length <= 1) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % quests.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [quests.length])

  if (loading) {
    return (
      <Card>
        <Skeleton height={14} width="30%" style={{ marginBottom: spacing.sm }} />
        <Skeleton height={18} width="60%" />
      </Card>
    )
  }

  if (board?.dailyAllClear) {
    return (
      <Card>
        <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: colors.primary }}>오늘의 퀘스트</p>
        <h3 style={{ margin: '2px 0 0', fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>
          🎉 오늘의 퀘스트를 모두 완료했어요!
        </h3>
      </Card>
    )
  }

  if (quests.length === 0) return null

  const quest = quests[index % quests.length]

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <QuestCheckMark completed={quest.completed} />
        {/* key={quest.id}: 인덱스가 바뀔 때마다 노드를 새로 만들어 .tds-card-swap 전환이 매번(10초마다)
            다시 재생되게 한다 — Analyze.jsx가 분석 상태 전환에 쓰는 것과 같은 방식. */}
        <div key={quest.id} className="tds-card-swap" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: colors.primary }}>오늘의 퀘스트</p>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colors.primary,
                background: colors.primarySurface,
                borderRadius: radius.pill,
                padding: '2px 8px',
              }}
            >
              +{quest.xp}XP
            </span>
          </div>
          <h3 style={{ margin: '2px 0 0', fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>{quest.title}</h3>
          <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.sm, color: colors.textSub }}>{quest.description}</p>
        </div>
      </div>

      {quests.length > 1 && (
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: spacing.sm }}>
          {quests.map((q, i) => (
            <span
              key={q.id}
              style={{ width: 6, height: 6, borderRadius: '50%', background: colors.primary, opacity: i === index ? 1 : 0.3 }}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
