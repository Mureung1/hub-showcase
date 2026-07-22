import ProgressBarFill from './ProgressBarFill.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { formatNutrient, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// [파일 이름 주의] 원래는 분석 결과를 음식별 카드로 쭉 나열하는 NutritionCard를 기본 export하던
// 파일이지만, 홈 탭이 "같은 자리에서 카드가 전환되는" 구조로 바뀌며 그 카드는
// AnalysisResultCard.jsx로 대체돼 제거됐다. 지금 이 파일이 제공하는 것은 아래 NutrientBars 하나뿐이고,
// 홈 탭 결과 카드와 식단 탭의 "자세한 영양" 아코디언이 함께 쓴다.

// 막대 시각화를 위한 "한 끼 기준" 참고 상한값(진단 RDA가 아님). 이 컴포넌트 전용 표시 스케일이라 로컬로 둔다.
const BAR_MAX = {
  calories: 900,
  protein: 40,
  carbs: 100,
  fat: 35,
  fiber: 15,
  sodium: 2000,
}

// 식단 탭의 "자세한 영양" 아코디언에서도 재사용하는 상세 막대 그래프
export function NutrientBars({ nutrients }) {
  const visible = useVisibleNutrients()
  const labels = NUTRIENT_LABELS.filter(({ key }) => visible[key])

  return (
    <div>
      {labels.map(({ key, label, unit }) => {
        const value = nutrients[key]
        // 라벨 스캔 결과는 표에 없는 항목이 null일 수 있다(추정 금지) — 그 경우 0으로 보이지 않게 '-'로 표시.
        const isUnknown = value == null
        const max = BAR_MAX[key]
        const percent = !isUnknown && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

        return (
          <div key={key} style={{ marginBottom: spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
              <span style={{ color: colors.textSub, fontSize: font.size.sm }}>{label}</span>
              <span style={{ fontWeight: 700, color: colors.textStrong, fontSize: font.size.sm }}>
                {isUnknown ? '-' : formatNutrient(value)}
                {!isUnknown && <span style={{ fontWeight: 400, color: colors.muted, marginLeft: 2 }}>{unit}</span>}
              </span>
            </div>
            <div style={{ height: 6, background: colors.track, borderRadius: radius.pill, overflow: 'hidden' }}>
              <ProgressBarFill percent={percent} color={isUnknown ? colors.border : colors.primary} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
