import { useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AchievementRing from './AchievementRing.jsx'
import Card from './Card.jsx'
import { toDateKey } from '../lib/records.js'
import { addMl, getWaterIntake, getWaterTargetMl, toggleSupplement, WATER_CUP_ML } from '../lib/waterIntake.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// MY 탭 전용 "오늘 물 섭취 · 영양제" 체크리스트. 진짜 알림이 아니라 앱을 열었을 때만 기록/확인되는
// 기능이라 "알림"이라는 단어는 문구에 쓰지 않는다 — 앱을 열 이유를 하나 더 만드는 것이 목적이지,
// 실제로 시간이 되면 울리는 것이 아니다.
//
// FR-20: 고정 8잔 사각형 목록 대신, 체중 기반 개인별 mL 목표를 AchievementRing(FR-14 추출)으로
// 시각화한다. 기록은 "물 한 컵(+200ml)" 버튼 한 번으로 누적한다.
export default function WaterIntakeCard() {
  const { effectiveUserId, profile } = useUser()
  const dateKey = toDateKey(new Date())
  const targetMl = getWaterTargetMl(profile?.weightKg, profile?.activity)
  const [intake, setIntake] = useState(() => getWaterIntake(effectiveUserId, dateKey))

  const percent = targetMl > 0 ? Math.round(Math.min(100, (intake.mlConsumed / targetMl) * 100)) : 0

  function handleAddCup() {
    setIntake(addMl(effectiveUserId, dateKey, WATER_CUP_ML, targetMl))
  }

  function handleSupplementToggle() {
    setIntake(toggleSupplement(effectiveUserId, dateKey))
  }

  return (
    <Card>
      <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.md}px`, color: colors.textStrong }}>
        오늘 물 마셨나요?
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md }}>
        <AchievementRing percent={percent} size={96} strokeWidth={10}>
          <span style={{ fontSize: font.size.sm, fontWeight: 800, color: colors.title }}>{percent}%</span>
        </AchievementRing>
        <div style={{ flex: 1 }}>
          <p style={{ margin: `0 0 ${spacing.sm}px`, color: colors.textSub, fontSize: font.size.sm }}>
            {intake.mlConsumed}ml / {targetMl}ml 마셨어요.
          </p>
          <button
            type="button"
            className="tds-press"
            onClick={handleAddCup}
            disabled={intake.mlConsumed >= targetMl}
            style={{
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderRadius: radius.pill,
              border: 'none',
              background: colors.primary,
              color: '#fff',
              fontWeight: 700,
              fontSize: font.size.sm,
              cursor: intake.mlConsumed >= targetMl ? 'default' : 'pointer',
              opacity: intake.mlConsumed >= targetMl ? 0.5 : 1,
            }}
          >
            물 한 컵 (+{WATER_CUP_ML}ml)
          </button>
        </div>
      </div>
      <button
        type="button"
        className="tds-press"
        onClick={handleSupplementToggle}
        aria-pressed={intake.supplementTaken}
        style={{
          padding: `${spacing.sm}px ${spacing.lg}px`,
          borderRadius: radius.pill,
          border: 'none',
          background: intake.supplementTaken ? colors.primary : colors.bg,
          color: intake.supplementTaken ? '#fff' : colors.textSub,
          fontWeight: 600,
          fontSize: font.size.sm,
          cursor: 'pointer',
        }}
      >
        {intake.supplementTaken ? '영양제 챙겨 먹었어요 ✓' : '영양제 챙겨 먹었어요'}
      </button>
    </Card>
  )
}
