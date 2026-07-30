import ProgressBarFill from './ProgressBarFill.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { isLimitNutrient } from '../lib/nutrientCriteria.js'
import { buildNutrientStatusRows, formatNutrient, NUTRIENT_STATUS } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 식단 탭과 달력 탭의 "영양소" 카드 — **두 탭이 공유하는 단 하나의 구현**이다.
// 예전엔 같은 정보를 두 탭이 서로 다른 모양으로 그렸다(식단은 "16 / 131 g" + "115g 더 필요해요",
// 달력은 "65% 부족"). 지금 모양은 식단 탭 쪽이었던 섭취량/목표 + 남은 양 안내로 통일한 것이다.
// 퍼센트만 보여주는 것보다 "얼마나 더 먹어야 하는지"가 바로 나와서 다음 행동으로 이어진다.
//
// 달성률 도넛 + 충족/부족/초과 개수는 이 컴포넌트 밖에 있다(Calendar.jsx의 DaySummaryCard — 날짜를
// 고르면 항상 보이는 요약 카드로, 세그먼트 탭을 넘나들어도 계속 보여야 해서 분리했다). 그 개수와
// 여기 막대의 색이 서로 다른 기준으로 판정되면 같은 화면에서 같은 데이터가 모순되게 보이므로
// (리뷰에서 발견: 이 막대가 한때 자체적인 이분법 기준을 썼다), 색·문구 판정은 반드시
// classifyNutrientStatus(nutrition.js, DaySummaryCard/TodayScoreSummary와 동일 함수)의 결과인
// row.status 하나만 따른다 — 임계값을 여기서 다시 계산하지 않는다.

// 나트륨은 "채워야 할 목표"가 아니라 "넘기면 안 되는 한도"라서 막대 색/문구를 반대로 다룬다.
// 방향이 반대라는 사실을 별도 배지 없이 문구로 직접 말한다("한도까지 83mg 남았어요") — 퍼센트만
// 보여주던 시절엔 "70%니까 아직 부족하네"로 읽힐 여지가 있어 배지가 필요했지만, 지금은 문장이
// 그 역할을 대신한다.
function IntakeBar({ row }) {
  const { label, unit, actual, recommended, status } = row
  const isLimit = isLimitNutrient(row.key)
  const value = formatNutrient(actual)
  const fillPercent = Math.max(0, Math.min(100, row.percent))
  const diff = formatNutrient(Math.abs(actual - recommended))

  let barColor
  let statusText
  let statusColor

  if (status === NUTRIENT_STATUS.DEFICIENT) {
    barColor = colors.deficient
    statusText = `${diff}${unit} 더 필요해요`
    statusColor = colors.deficientText
  } else if (status === NUTRIENT_STATUS.EXCEEDED) {
    barColor = colors.danger
    statusText = isLimit ? `${diff}${unit} 줄여야 해요` : `적정량보다 ${diff}${unit} 많아요`
    statusColor = colors.dangerText
  } else if (isLimit) {
    // SATISFIED + 한도형 — 아직 한도 안이다. 막대 채우기(barColor)는 원래 톤을 유지하고,
    // 텍스트(statusColor)만 대비가 확보된 톤을 쓴다.
    barColor = colors.satisfied
    statusText = `한도까지 ${diff}${unit} 남았어요`
    statusColor = colors.muted
  } else {
    // SATISFIED + 목표형 — 권장량의 80% 이상이면 이미 충족이다(100% 미만이어도 "더 필요해요"라고
    // 하지 않는다 — DaySummaryCard의 충족 개수와 어긋나게 된다).
    barColor = colors.satisfied
    statusText = actual >= recommended ? `달성 · +${diff}${unit}` : '달성했어요'
    statusColor = colors.satisfied
  }

  return (
    <div style={{ marginBottom: spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.xs }}>
        <span style={{ color: colors.textStrong, fontSize: font.size.sm, fontWeight: 600 }}>{label}</span>
        <span style={{ color: colors.textSub, fontSize: font.size.xs }}>
          {value} / {formatNutrient(recommended)} {unit}
        </span>
      </div>
      <div style={{ height: 8, background: colors.track, borderRadius: radius.pill, overflow: 'hidden' }}>
        <ProgressBarFill percent={fillPercent} color={barColor} />
      </div>
      <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, fontWeight: 600, color: statusColor }}>{statusText}</p>
    </div>
  )
}

// recommended/total: 둘 다 NutrientSet(6개 영양소).
// excludeKeys: 화면 위쪽에서 이미 보여주는 영양소를 빼는 용도(식단 탭은 칼로리를 TodayScoreSummary가
// 담당해서 여기선 제외한다). 표시 순서는 NUTRIENT_LABELS 순서를 그대로 따른다 — 상태별로 재정렬하면
// 날마다 줄 순서가 바뀌어서 같은 영양소를 눈으로 찾기 어려워진다.
export default function NutritionStatusPanel({ recommended, total, excludeKeys = [] }) {
  const visible = useVisibleNutrients()
  const rows = buildNutrientStatusRows(recommended, total).filter(
    (row) => visible[row.key] && !excludeKeys.includes(row.key),
  )

  return (
    <div>
      {rows.map((row) => (
        <IntakeBar key={row.key} row={row} />
      ))}
    </div>
  )
}
