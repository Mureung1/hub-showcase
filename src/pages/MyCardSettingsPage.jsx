import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import { useUser } from '../context/UserContext.jsx'
import { toggleVisibleNutrient, useVisibleNutrients } from '../lib/cardSettings.js'
import { formatNutrient, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// MY 탭 개편 — 예전 CardSettingsPanel(토글 목록만 있던 임베드 카드)을 전용 화면으로 승격하고, 실제
// 오늘 데이터로 미리보기를 추가했다(예전엔 미리보기가 전혀 없어 토글이 실제로 뭘 바꾸는지 바로 보이지
// 않았다). 토글 자체는 cardSettings.js를 그대로 재사용 — 여기서 바꾼 값은 홈·식단 화면의 실제 영양
// 카드에도 즉시 반영된다(useVisibleNutrients를 구독하는 모든 곳이 같은 저장소를 본다).
export default function MyCardSettingsPage() {
  const navigate = useNavigate()
  const visible = useVisibleNutrients()
  const { todayMealsTotal, effectiveRecommended } = useUser()

  const visibleLabels = NUTRIENT_LABELS.filter(({ key }) => visible[key])

  return (
    <div style={styles.page}>
      <ScreenHeader title="카드 표시 항목" onBack={() => navigate('/profile')} />

      <Card style={{ marginBottom: spacing.lg }}>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
          홈·식단 화면의 영양 카드에 보일 영양소를 골라보세요.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {NUTRIENT_LABELS.map(({ key, label }) => {
            const active = visible[key]
            return (
              <button
                key={key}
                type="button"
                className="tds-press"
                onClick={() => toggleVisibleNutrient(key)}
                aria-pressed={active}
                style={{
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  borderRadius: radius.pill,
                  border: 'none',
                  background: active ? colors.primary : colors.bg,
                  color: active ? '#fff' : colors.textSub,
                  fontWeight: 600,
                  fontSize: font.size.sm,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </Card>

      <div>
        <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>미리보기</h3>
        <Card>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <h4 style={{ margin: 0, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>오늘의 영양</h4>
            <span style={{ fontSize: font.size.xs, color: colors.textSub }}>{visibleLabels.map((n) => n.label).join(' · ') || '표시할 항목 없음'}</span>
          </div>
          {visibleLabels.length === 0 ? (
            <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>모든 항목을 껐어요 — 하나 이상 켜주세요.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              {visibleLabels.map(({ key, label }) => {
                const actual = todayMealsTotal?.[key] ?? 0
                const rec = effectiveRecommended?.[key] ?? 0
                const percent = rec > 0 ? Math.round(Math.min(100, (actual / rec) * 100)) : 0
                return (
                  <div key={key} style={{ padding: spacing.sm, borderRadius: radius.sm, background: colors.bg }}>
                    <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub }}>{label}</p>
                    <p style={{ margin: `2px 0 0`, fontSize: font.size.md, fontWeight: 800, color: colors.textStrong }}>
                      {formatNutrient(percent)}%
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
