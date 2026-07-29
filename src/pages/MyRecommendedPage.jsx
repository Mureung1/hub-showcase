import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import ProgressBarFill from '../components/ProgressBarFill.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import StandardComparisonList from '../components/StandardComparisonList.jsx'
import { useUser } from '../context/UserContext.jsx'
import { isLimitNutrient } from '../lib/nutrientCriteria.js'
import { formatNutrient, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { getStandardIntake } from '../lib/standardIntake.js'
import { toDateKey } from '../lib/records.js'
import { getWaterIntake, getWaterTargetMl } from '../lib/waterIntake.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// MY 탭 개편 — Profile.jsx에 이미 있던 동명 섹션(StandardComparisonList, "내 권장량 vs 또래 평균")과는
// 다른 화면이다. 여기는 목업 그대로 "오늘 실제 섭취 vs 내 권장량"(오늘의 진행률)을 보여준다 — 기존
// 표준 비교 섹션은 삭제하지 않고 하단에 별도 소제목으로 그대로 유지한다(다른 정보라 둘 다 가치가 있음).
export default function MyRecommendedPage() {
  const navigate = useNavigate()
  const { profile, todayMealsTotal, effectiveRecommended, effectiveUserId } = useUser()

  const calorieActual = todayMealsTotal?.calories ?? 0
  const calorieRec = effectiveRecommended?.calories ?? 0
  const calorieRemaining = Math.max(0, calorieRec - calorieActual)
  const caloriePercent = calorieRec > 0 ? Math.min(100, (calorieActual / calorieRec) * 100) : 0

  const dateKey = toDateKey(new Date())
  const targetMl = getWaterTargetMl(profile?.weightKg, profile?.activity)
  const waterMl = getWaterIntake(effectiveUserId, dateKey).mlConsumed

  const rows = [
    ...NUTRIENT_LABELS.filter(({ key }) => key !== 'calories'),
    { key: 'water', label: '물', unit: 'ml' },
  ]

  const standardIntake = profile?.age ? getStandardIntake(profile.sex, profile.age) : null

  return (
    <div style={styles.page}>
      <ScreenHeader title="하루 권장 섭취량" onBack={() => navigate('/profile')} />

      <Card style={{ background: colors.primary, boxShadow: 'none', marginBottom: spacing.lg }}>
        <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>오늘 섭취 / 권장 칼로리</p>
        <p style={{ margin: '2px 0 8px', fontSize: font.size.xxl, fontWeight: 800, color: '#fff' }}>
          {formatNutrient(calorieActual)} / {formatNutrient(calorieRec)} kcal
        </p>
        <div style={{ height: 8, borderRadius: radius.pill, background: 'rgba(255,255,255,0.35)', overflow: 'hidden', marginBottom: spacing.xs }}>
          <ProgressBarFill percent={caloriePercent} color="#fff" />
        </div>
        <p style={{ margin: 0, fontSize: font.size.xs, color: 'rgba(255,255,255,0.85)' }}>{formatNutrient(calorieRemaining)}kcal 남았어요</p>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        {rows.map(({ key, label, unit }) => {
          const actual = key === 'water' ? waterMl : (todayMealsTotal?.[key] ?? 0)
          const rec = key === 'water' ? targetMl : (effectiveRecommended?.[key] ?? 0)
          const limit = key !== 'water' && isLimitNutrient(key)
          const percent = rec > 0 ? Math.min(100, (actual / rec) * 100) : 0
          const overLimit = limit && actual > rec
          return (
            <div key={key} style={{ marginBottom: spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <span style={{ fontSize: font.size.sm, color: colors.textSub }}>{label}</span>
                <span style={{ fontSize: font.size.sm, fontWeight: 700, color: overLimit ? colors.dangerText : colors.textStrong }}>
                  {formatNutrient(actual)} / {formatNutrient(rec)}
                  {unit}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: radius.pill, background: colors.track, overflow: 'hidden' }}>
                <ProgressBarFill percent={percent} color={overLimit ? colors.danger : colors.primary} />
              </div>
            </div>
          )
        })}
      </Card>

      <Card
        flat
        onClick={() => navigate('/profile')}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}
      >
        <div>
          <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>산출 기준 · 건강 정보</p>
          <p style={{ margin: `2px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
            {profile?.age}세 · {profile?.sex === 'male' ? '남성' : '여성'} · {profile?.heightCm}cm · {profile?.weightKg}kg
          </p>
        </div>
        <span style={{ color: colors.muted }}>›</span>
      </Card>

      {standardIntake && (
        <Card style={{ marginBottom: spacing.lg }}>
          <h3 style={{ margin: `0 0 ${spacing.xs}px`, fontSize: font.size.md, color: colors.textStrong }}>또래 평균과 비교</h3>
          <p style={{ margin: `0 0 ${spacing.lg}px`, fontSize: font.size.xs, color: colors.textSub }}>같은 나이·성별 표준 평균과 비교했어요</p>
          <StandardComparisonList mine={effectiveRecommended} standard={standardIntake} />
        </Card>
      )}

      <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub, textAlign: 'center' }}>
        한국인 영양섭취기준(2020)을 바탕으로 계산했어요. 건강 정보를 수정하면 권장량도 다시 계산돼요.
      </p>
    </div>
  )
}
