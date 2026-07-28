import ProgressBarFill from './ProgressBarFill.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { isLimitNutrient } from '../lib/nutrientCriteria.js'
import { buildNutrientStatusRows, calcAchievementPercent, NUTRIENT_STATUS } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 중앙 도넛 1개(하루 목표 달성률) + 상태 배지 3개 + 상태색 가로 막대 6줄로 그날 영양 상태를 보여준다.
const DONUT_SIZE = 168
const DONUT_CENTER = DONUT_SIZE / 2
const DONUT_STROKE = 14
const DONUT_RADIUS = DONUT_CENTER - DONUT_STROKE / 2

const STATUS_META = {
  [NUTRIENT_STATUS.SATISFIED]: { label: '충족', color: colors.satisfied, surface: colors.satisfiedSurface },
  [NUTRIENT_STATUS.DEFICIENT]: { label: '부족', color: colors.deficient, surface: colors.deficientSurface },
  [NUTRIENT_STATUS.EXCEEDED]: { label: '초과', color: colors.danger, surface: colors.dangerSurface },
}

// meta.color는 막대 채우기(ProgressBarFill)·배지 픽셀을 그대로 유지하기 위한 값이라 손대지 않고,
// 아래 NutrientBarRow의 퍼센트+상태 라벨처럼 흰 배경 위 순수 텍스트로 쓰는 자리만 이 맵을 쓴다.
const STATUS_TEXT_COLOR = {
  [NUTRIENT_STATUS.SATISFIED]: colors.satisfied,
  [NUTRIENT_STATUS.DEFICIENT]: colors.deficientText,
  [NUTRIENT_STATUS.EXCEEDED]: colors.dangerText,
}

const STATUS_ORDER = [NUTRIENT_STATUS.SATISFIED, NUTRIENT_STATUS.DEFICIENT, NUTRIENT_STATUS.EXCEEDED]

function StatusCountBadge({ status, count }) {
  const meta = STATUS_META[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 14px',
        borderRadius: radius.pill,
        background: meta.surface,
        color: meta.color,
        fontSize: font.size.sm,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label} {count}
    </span>
  )
}

// 나트륨 게이지(6주차 §3): 기준 이내=정상색+"충족", 초과=경고색+"초과"를 색만이 아니라 텍스트로도
// 병기한다 — 다른 5개(목표형)는 퍼센트가 높을수록 좋지만 나트륨은 반대라, 색만으로는 "70%니까
// 아직 부족하네"로 오해하기 쉽다. 라벨 옆 "상한" 배지로 방향이 반대임을 한 번 더 표시한다.
function NutrientBarRow({ row }) {
  const meta = STATUS_META[row.status]
  const fillPercent = Math.max(0, Math.min(100, row.percent))
  const isOver = row.percent > 100

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 76px', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <span style={{ fontSize: font.size.sm, color: colors.textStrong, fontWeight: 600, whiteSpace: 'nowrap' }}>
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
      <div style={{ height: 10, background: colors.track, borderRadius: radius.pill, overflow: 'hidden' }}>
        <ProgressBarFill percent={fillPercent} color={meta.color} />
      </div>
      <span
        style={{ fontSize: font.size.xs, fontWeight: 700, color: STATUS_TEXT_COLOR[row.status], textAlign: 'right', lineHeight: 1.4 }}
      >
        {row.percent}%{isOver ? '!' : ''}
        <br />
        {meta.label}
      </span>
    </div>
  )
}

// recommended/total: 둘 다 NutrientSet(6개 영양소).
export default function NutritionStatusPanel({ recommended, total }) {
  const visible = useVisibleNutrients()
  const rows = buildNutrientStatusRows(recommended, total)
  const achievementPercent = Math.max(0, Math.min(100, calcAchievementPercent(recommended, total)))

  // 달성률/충족·부족·초과 개수는 카드 표시 설정과 무관하게 항상 실제 6개 전부 기준으로 정확하게
  // 유지한다 — 화면에 안 보이는 영양소가 있다고 해서 "충족 3개"가 "충족 2개"로 잘못 줄어들면 안 된다.
  const counts = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = rows.filter((r) => r.status === status).length
    return acc
  }, {})

  // 충족 → 부족 → 초과 순으로 묶어 보여줘서 상태가 한눈에 들어오게 정렬한다. 실제로 막대로 그리는
  // 목록만 표시 설정으로 걸러낸다.
  const sortedRows = STATUS_ORDER.flatMap((status) => rows.filter((r) => r.status === status)).filter(
    (row) => visible[row.key],
  )

  const circumference = 2 * Math.PI * DONUT_RADIUS
  const offset = circumference * (1 - achievementPercent / 100)

  return (
    <div>
      <div style={{ width: DONUT_SIZE, margin: '0 auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label="하루 목표 달성률"
        >
          <circle cx={DONUT_CENTER} cy={DONUT_CENTER} r={DONUT_RADIUS} fill="none" stroke={colors.track} strokeWidth={DONUT_STROKE} />
          <circle
            cx={DONUT_CENTER}
            cy={DONUT_CENTER}
            r={DONUT_RADIUS}
            fill="none"
            stroke={colors.primary}
            strokeWidth={DONUT_STROKE}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${DONUT_CENTER} ${DONUT_CENTER})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: font.size.xxl, fontWeight: 800, color: colors.textStrong }}>{achievementPercent}%</span>
          <span style={{ fontSize: font.size.xs, color: colors.textSub, marginTop: 2 }}>하루 목표 달성률</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }}>
        {STATUS_ORDER.map((status) => (
          <StatusCountBadge key={status} status={status} count={counts[status]} />
        ))}
      </div>

      <div style={{ marginTop: spacing.xl }}>
        {sortedRows.map((row) => (
          <NutrientBarRow key={row.key} row={row} />
        ))}
      </div>

      <p style={{ margin: 0, fontSize: font.size.xs, color: colors.muted, textAlign: 'center' }}>초록=충족 · 주황=부족 · 빨강=초과</p>
    </div>
  )
}
