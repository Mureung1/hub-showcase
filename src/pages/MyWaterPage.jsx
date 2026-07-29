import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AchievementRing from '../components/AchievementRing.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { useUser } from '../context/UserContext.jsx'
import { logicalWeekKey } from '../lib/logicalDate.js'
import { getWeekWaterHistory } from '../lib/questWeekContext.js'
import { toDateKey } from '../lib/records.js'
import { addMl, getWaterIntake, getWaterTargetMl, removeEntry, toggleSupplement, WATER_CUP_ML } from '../lib/waterIntake.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const QUICK_ADD_ML = [WATER_CUP_ML, 100, 500]
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function formatTime(at) {
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// MY 탭 개편 — 예전 WaterIntakeCard(오늘 하루 합계만 있던 임베드 카드)를 전용 화면으로 승격하며 개별
// 기록(entries)·+100/+500ml·직접 입력·이번 주 막대그래프를 새로 추가했다(waterIntake.js 데이터 모델
// 확장). "영양제" 그리드 아이콘도 별도 화면 없이 이 화면으로 합쳤다(사용자 확인).
export default function MyWaterPage() {
  const navigate = useNavigate()
  const { effectiveUserId, profile } = useUser()
  const dateKey = toDateKey(new Date())
  const targetMl = getWaterTargetMl(profile?.weightKg, profile?.activity)
  const [intake, setIntake] = useState(() => getWaterIntake(effectiveUserId, dateKey))
  const [customOpen, setCustomOpen] = useState(false)
  const [customMl, setCustomMl] = useState('')

  const percent = targetMl > 0 ? Math.round(Math.min(100, (intake.mlConsumed / targetMl) * 100)) : 0
  const weekHistory = getWeekWaterHistory(effectiveUserId, logicalWeekKey(new Date()))
  const maxHistoryMl = Math.max(targetMl, ...weekHistory.map((d) => d.mlConsumed), 1)
  const avgMl = Math.round(weekHistory.reduce((sum, d) => sum + d.mlConsumed, 0) / weekHistory.length)

  function handleAdd(deltaMl) {
    setIntake(addMl(effectiveUserId, dateKey, deltaMl, targetMl))
  }

  function handleCustomSubmit() {
    const ml = Number(customMl)
    if (ml > 0) handleAdd(ml)
    setCustomMl('')
    setCustomOpen(false)
  }

  function handleRemove(entryId) {
    setIntake(removeEntry(effectiveUserId, dateKey, entryId))
  }

  function handleSupplementToggle() {
    setIntake(toggleSupplement(effectiveUserId, dateKey))
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="물 기록" onBack={() => navigate('/profile')} />

      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>
          <AchievementRing percent={percent} size={140} strokeWidth={12} />
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
            {intake.mlConsumed}ml / {targetMl}ml
          </p>
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
            {QUICK_ADD_ML.map((ml) => (
              <button
                key={ml}
                type="button"
                className="tds-press"
                onClick={() => handleAdd(ml)}
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
                +{ml}ml
              </button>
            ))}
            <button
              type="button"
              className="tds-press"
              onClick={() => setCustomOpen((v) => !v)}
              style={{
                padding: `${spacing.sm}px ${spacing.lg}px`,
                borderRadius: radius.pill,
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.textStrong,
                fontWeight: 700,
                fontSize: font.size.sm,
                cursor: 'pointer',
              }}
            >
              직접 입력
            </button>
          </div>
          {customOpen && (
            <div style={{ display: 'flex', gap: spacing.sm, width: '100%', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="추가할 양(ml)"
                  id="water-custom-ml"
                  type="number"
                  min="1"
                  value={customMl}
                  onChange={(e) => setCustomMl(e.target.value)}
                  placeholder="예: 350"
                />
              </div>
              <button
                type="button"
                className="tds-press"
                onClick={handleCustomSubmit}
                style={{
                  height: 44,
                  padding: `0 ${spacing.lg}px`,
                  borderRadius: radius.sm,
                  border: 'none',
                  background: colors.primary,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                추가
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>오늘 기록</h3>
        {intake.entries.length === 0 ? (
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>아직 기록이 없어요.</p>
        ) : (
          [...intake.entries]
            .sort((a, b) => a.at - b.at)
            .map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${spacing.sm}px 0`,
                  borderTop: i === 0 ? 'none' : `1px solid ${colors.border}`,
                }}
              >
                <span style={{ fontSize: font.size.sm, color: colors.textStrong }}>
                  {formatTime(entry.at)} · 물 {entry.ml}ml
                </span>
                <button
                  type="button"
                  className="tds-press"
                  onClick={() => handleRemove(entry.id)}
                  style={{ border: 'none', background: 'none', color: colors.muted, fontSize: font.size.xs, cursor: 'pointer' }}
                >
                  삭제
                </button>
              </div>
            ))
        )}
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <h3 style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>이번 주</h3>
          <span style={{ fontSize: font.size.xs, color: colors.textSub }}>평균 {Number.isFinite(avgMl) ? avgMl : 0}ml</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing.sm, height: 80 }}>
          {weekHistory.map((day, i) => (
            <div key={day.dateKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs, height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(2, Math.round((day.mlConsumed / maxHistoryMl) * 100))}%`,
                    borderRadius: radius.sm,
                    background: day.dateKey === dateKey ? colors.primary : colors.primarySurface,
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: colors.textSub }}>{WEEKDAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </Card>

      <button
        type="button"
        className="tds-press"
        onClick={handleSupplementToggle}
        aria-pressed={intake.supplementTaken}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: `${spacing.md}px ${spacing.lg}px`,
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
    </div>
  )
}
