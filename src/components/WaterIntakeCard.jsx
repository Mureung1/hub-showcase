import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AchievementRing from './AchievementRing.jsx'
import Card from './Card.jsx'
import Pressable from './Pressable.jsx'
import { toDateKey } from '../lib/records.js'
import { addMl, getWaterIntake, getWaterTargetMl, WATER_CUP_ML } from '../lib/waterIntake.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭 개편 — 예전엔 "오늘 물 섭취 · 영양제"를 한 카드에 다 담았지만, 이제 MY 탭 홈에는 컴팩트한
// "오늘 물" 위젯만 두고(영양제 토글은 뺐다 — /profile/water 상세 화면에만 있음, 사용자 확인), 카드를
// 누르면 그 상세 화면(개별 기록·주간 막대그래프·영양제 포함)으로 이동한다. "물 한 컵" 버튼은 이 위젯
// 안에서 바로 기록되고(이동 없이), 카드의 나머지 영역만 이동을 트리거한다 — 두 인터랙션이 겹치지
// 않도록 버튼과 이동 영역을 형제 요소로 분리했다(버튼을 클릭 가능한 카드 안에 중첩하지 않음).
export default function WaterIntakeCard() {
  const navigate = useNavigate()
  const { effectiveUserId, profile } = useUser()
  const dateKey = toDateKey(new Date())
  const targetMl = getWaterTargetMl(profile?.weightKg, profile?.activity)
  const [intake, setIntake] = useState(() => getWaterIntake(effectiveUserId, dateKey))

  const percent = targetMl > 0 ? Math.round(Math.min(100, (intake.mlConsumed / targetMl) * 100)) : 0

  function handleAddCup() {
    setIntake(addMl(effectiveUserId, dateKey, WATER_CUP_ML, targetMl))
  }

  return (
    <Card style={{ height: '100%', boxSizing: 'border-box' }}>
      <Pressable
        as="div"
        scale={0.98}
        role="button"
        tabIndex={0}
        aria-label="물 기록 화면으로 이동"
        onClick={() => navigate('/profile/water')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate('/profile/water')
        }}
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm }}
      >
        <h3 style={{ fontSize: font.size.sm, fontWeight: 700, margin: 0, color: colors.textStrong, alignSelf: 'flex-start' }}>오늘 물</h3>
        <AchievementRing percent={percent} size={72} strokeWidth={8}>
          <span style={{ fontSize: font.size.xs, fontWeight: 800, color: colors.title }}>{percent}%</span>
        </AchievementRing>
        <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.xs }}>
          {intake.mlConsumed}ml / {targetMl}ml
        </p>
      </Pressable>
      <button
        type="button"
        className="tds-press"
        onClick={handleAddCup}
        disabled={intake.mlConsumed >= targetMl}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          marginTop: spacing.sm,
          padding: `${spacing.sm}px ${spacing.lg}px`,
          borderRadius: radius.pill,
          border: 'none',
          background: colors.primary,
          color: '#fff',
          fontWeight: 700,
          fontSize: font.size.xs,
          cursor: intake.mlConsumed >= targetMl ? 'default' : 'pointer',
          opacity: intake.mlConsumed >= targetMl ? 0.5 : 1,
        }}
      >
        물 한 컵 (+{WATER_CUP_ML}ml)
      </button>
    </Card>
  )
}
