import ProgressBarFill from './ProgressBarFill.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { isLimitNutrient } from '../lib/nutrientCriteria.js'
import { buildNutrientStatusRows, NUTRIENT_STATUS } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 영양소별 상태 막대 목록 — 달력 탭 날짜 상세의 "영양소" 탭 콘텐츠. 달성률 도넛 + 충족/부족/초과
// 개수는 지도·달력 모바일 개편 3안에서 이 컴포넌트 밖으로 옮겨졌다(Calendar.jsx의 DaySummaryCard —
// 날짜를 고르면 항상 보이는 요약 카드로, 탭을 넘나들어도 계속 보여야 해서 세그먼트 탭 안에 있는
// 이 컴포넌트와는 분리했다). 계산 자체(달성률 공식 등)는 그대로 nutrition.js가 1차 소스다.
const STATUS_META = {
  [NUTRIENT_STATUS.SATISFIED]: { label: '충족', color: colors.satisfied },
  [NUTRIENT_STATUS.DEFICIENT]: { label: '부족', color: colors.deficient },
  [NUTRIENT_STATUS.EXCEEDED]: { label: '초과', color: colors.danger },
}

// meta.color는 막대 채우기(ProgressBarFill) 픽셀을 그대로 유지하기 위한 값이라 손대지 않고,
// 아래 NutrientBarRow의 퍼센트+상태 라벨처럼 흰 배경 위 순수 텍스트로 쓰는 자리만 이 맵을 쓴다.
const STATUS_TEXT_COLOR = {
  [NUTRIENT_STATUS.SATISFIED]: colors.satisfied,
  [NUTRIENT_STATUS.DEFICIENT]: colors.deficientText,
  [NUTRIENT_STATUS.EXCEEDED]: colors.dangerText,
}

const STATUS_ORDER = [NUTRIENT_STATUS.SATISFIED, NUTRIENT_STATUS.DEFICIENT, NUTRIENT_STATUS.EXCEEDED]

// 나트륨 게이지(6주차 §3): 기준 이내=정상색+"충족", 초과=경고색+"초과"를 색만이 아니라 텍스트로도
// 병기한다 — 다른 5개(목표형)는 퍼센트가 높을수록 좋지만 나트륨은 반대라, 색만으로는 "70%니까
// 아직 부족하네"로 오해하기 쉽다. 라벨 옆 "상한" 배지로 방향이 반대임을 한 번 더 표시한다.
function NutrientBarRow({ row }) {
  const meta = STATUS_META[row.status]
  const fillPercent = Math.max(0, Math.min(100, row.percent))
  const isOver = row.percent > 100

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <span style={{ fontSize: font.size.sm, color: colors.textStrong, fontWeight: 600, whiteSpace: 'nowrap', width: 56, flexShrink: 0 }}>
        {row.label}
        {isLimitNutrient(row.key) && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 10,
              fontWeight: 700,
              color: colors.textSub,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: '1px 3px',
              verticalAlign: 'middle',
            }}
          >
            상한
          </span>
        )}
      </span>
      <div style={{ flex: 1, height: 6, background: colors.track, borderRadius: radius.pill, overflow: 'hidden' }}>
        <ProgressBarFill percent={fillPercent} color={meta.color} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_TEXT_COLOR[row.status], textAlign: 'right', whiteSpace: 'nowrap' }}>
        {row.percent}%{isOver ? '!' : ''} {meta.label}
      </span>
    </div>
  )
}

// recommended/total: 둘 다 NutrientSet(6개 영양소).
export default function NutritionStatusPanel({ recommended, total }) {
  const visible = useVisibleNutrients()
  const rows = buildNutrientStatusRows(recommended, total)

  // 충족 → 부족 → 초과 순으로 묶어 보여줘서 상태가 한눈에 들어오게 정렬한다. 실제로 막대로 그리는
  // 목록만 표시 설정으로 걸러낸다.
  const sortedRows = STATUS_ORDER.flatMap((status) => rows.filter((r) => r.status === status)).filter(
    (row) => visible[row.key],
  )

  return <div>{sortedRows.map((row) => <NutrientBarRow key={row.key} row={row} />)}</div>
}
