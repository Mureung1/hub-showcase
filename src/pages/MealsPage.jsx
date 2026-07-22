import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import DeficientNutrientAds from '../components/DeficientNutrientAds.jsx'
import LeaderboardCard from '../components/LeaderboardCard.jsx'
import MealTypeBadge from '../components/MealTypeBadge.jsx'
import NationalComparisonCard from '../components/NationalComparisonCard.jsx'
import { NutrientBars } from '../components/NutritionCard.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import Skeleton from '../components/Skeleton.jsx'
import SourceBadge from '../components/SourceBadge.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { isSetMeal, sumNutrients } from '../lib/mealStore.js'
import { formatNutrient, formatNutrientOrDash, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 나트륨은 "채워야 할 목표"가 아니라 "넘기면 안 되는 한도"라서 막대 색/문구를 반대로 다룬다.
function IntakeBar({ label, unit, actual, recommended, isLimit }) {
  const value = formatNutrient(actual)
  const percent = recommended > 0 ? Math.min(100, Math.round((actual / recommended) * 100)) : 0
  const remaining = formatNutrient(recommended - actual)
  const over = remaining < 0

  let barColor
  let statusText
  let statusColor

  if (isLimit) {
    barColor = over ? colors.danger : colors.satisfied
    statusText = over ? `${-remaining}${unit} 줄여야 해요` : `한도까지 ${remaining}${unit} 남았어요`
    statusColor = over ? colors.danger : colors.muted
  } else if (over || remaining === 0) {
    barColor = colors.satisfied
    statusText = over ? `달성 · +${-remaining}${unit}` : '달성했어요'
    statusColor = colors.satisfied
  } else {
    barColor = colors.deficient
    statusText = `${remaining}${unit} 더 필요해요`
    statusColor = colors.deficient
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
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: barColor,
            borderRadius: radius.pill,
            transition: 'width 0.3s ease-out, background 0.3s ease-out',
          }}
        />
      </div>
      <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, fontWeight: 600, color: statusColor }}>{statusText}</p>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function DeleteButton({ onClick, label, disabled }) {
  return (
    <button
      type="button"
      className="tds-press"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} 삭제`}
      style={{
        border: 'none',
        background: colors.bg,
        color: colors.muted,
        borderRadius: radius.sm,
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <TrashIcon />
    </button>
  )
}

function NutrientSummaryLine({ nutrients }) {
  const visible = useVisibleNutrients()
  const n = nutrients || {}
  const labels = NUTRIENT_LABELS.filter(({ key }) => visible[key])

  return (
    <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.xs }}>
      {labels.map(({ key, label, unit }, i) => (
        <span key={key}>
          {i > 0 && ' · '}
          {label} {formatNutrientOrDash(n[key], unit)}
        </span>
      ))}
    </p>
  )
}

// 한 끼 세트를 펼쳤을 때 보여주는 개별 음식 한 줄. 삭제는 끼니 단위로만 가능해서 개별 삭제 버튼은 없다.
function MealItemRow({ item }) {
  return (
    <div style={{ padding: `${spacing.sm}px 0`, borderTop: `1px solid ${colors.border}` }}>
      <div style={{ marginBottom: spacing.xs }}>
        <SourceBadge source={item.source} />
      </div>
      <h4 style={{ fontSize: font.size.sm, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
        {item.name}
        {item.brand ? ` (${item.brand})` : ''}
      </h4>
      <NutrientSummaryLine nutrients={item.nutrients} />
    </div>
  )
}

// 단일 메뉴 끼니: 음식이 1개뿐이라 기존과 동일하게 카드 하나 + "자세한 영양"(막대 그래프) 토글로 보여준다.
function SingleMealCard({ record, expanded, onToggleDetail, onRemove, removing }) {
  const item = record.items[0]

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
            <SourceBadge source={item.source} />
            <MealTypeBadge mealType={record.mealType} />
          </div>
          <h3 style={{ fontSize: font.size.md, margin: `${spacing.sm}px 0 ${spacing.xs}px`, color: colors.textStrong }}>
            {item.name}
            {item.brand ? ` (${item.brand})` : ''}
          </h3>
          <NutrientSummaryLine nutrients={item.nutrients} />
        </div>
        <DeleteButton onClick={onRemove} label={item.name} disabled={removing} />
      </div>

      <button
        type="button"
        className="tds-press"
        onClick={onToggleDetail}
        aria-expanded={expanded}
        style={{ ...styles.linkButton, marginTop: spacing.md }}
      >
        {expanded ? '접기' : '자세한 영양'}
      </button>

      {expanded && (
        <div style={{ marginTop: spacing.md }}>
          <NutrientBars nutrients={item.nutrients} />
        </div>
      )}
    </Card>
  )
}

// 다중 메뉴 끼니(한 끼 세트): 학식·급식처럼 한 번에 여러 음식을 찍은 경우, 개별 카드로 흩어놓지 않고
// "대표 음식명 + 외 N개" 제목 + 끼니 전체 합계로 먼저 요약하고, "자세한 식사"로 펼쳐야 개별 음식이 보인다.
function SetMealCard({ record, expanded, onToggleDetail, onRemove, removing }) {
  const total = sumNutrients(record.items)
  const title = `${record.items[0].name} 외 ${record.items.length - 1}개`

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
            <MealTypeBadge mealType={record.mealType} />
          </div>
          <h3 style={{ fontSize: font.size.md, margin: `${spacing.sm}px 0 ${spacing.xs}px`, color: colors.textStrong }}>{title}</h3>
          <NutrientSummaryLine nutrients={total} />
        </div>
        <DeleteButton onClick={onRemove} label={title} disabled={removing} />
      </div>

      <button
        type="button"
        className="tds-press"
        onClick={onToggleDetail}
        aria-expanded={expanded}
        style={{ ...styles.linkButton, marginTop: spacing.md }}
      >
        {expanded ? '접기' : '자세한 식사'}
      </button>

      {expanded && (
        <div style={{ marginTop: spacing.sm }}>
          {record.items.map((item, i) => (
            <MealItemRow key={item.id ?? i} item={item} />
          ))}
        </div>
      )}
    </Card>
  )
}

function MealRecordCard({ record, expanded, onToggleDetail, onRemove, removing }) {
  return isSetMeal(record) ? (
    <SetMealCard record={record} expanded={expanded} onToggleDetail={onToggleDetail} onRemove={onRemove} removing={removing} />
  ) : (
    <SingleMealCard record={record} expanded={expanded} onToggleDetail={onToggleDetail} onRemove={onRemove} removing={removing} />
  )
}

export default function MealsPage() {
  const {
    todayMeals,
    todayMealsTotal,
    todayMealsLoading,
    todayMealsError,
    refetchTodayMeals,
    removeTodayMeal,
    effectiveRecommended,
  } = useUser()
  const recommended = effectiveRecommended
  const visible = useVisibleNutrients()
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [deleteError, setDeleteError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  function toggleDetail(mealRecordId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(mealRecordId)) {
        next.delete(mealRecordId)
      } else {
        next.add(mealRecordId)
      }
      return next
    })
  }

  async function handleRemove(mealRecordId) {
    setDeleteError('')
    setDeletingId(mealRecordId)
    try {
      await removeTodayMeal(mealRecordId)
    } catch (err) {
      setDeleteError(err.message || '삭제에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="식단" subtitle="오늘 먹은 음식과 남은 목표를 확인해보세요" />

      {recommended ? (
        <Card>
          <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.lg}px` }}>오늘의 영양 섭취량</h2>
          {NUTRIENT_LABELS.filter(({ key }) => visible[key]).map(({ key, label, unit }) => (
            <IntakeBar
              key={key}
              label={label}
              unit={unit}
              actual={todayMealsTotal[key]}
              recommended={recommended[key]}
              isLimit={key === 'sodium'}
            />
          ))}
        </Card>
      ) : (
        <Card style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: spacing.lg }}>신체정보가 없어 권장량을 계산할 수 없어요.</p>
          <Link
            to="/profile"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'flex', textDecoration: 'none' }}
          >
            프로필 입력하러 가기
          </Link>
        </Card>
      )}

      {/* PRD FR-3.1: 식단 요약 카드 "아래"에 놓는다(스크롤 최상단을 광고가 점유하지 않게). */}
      <DeficientNutrientAds />

      <LeaderboardCard />

      <NationalComparisonCard />

      <SectionTitle>오늘 먹은 음식</SectionTitle>
      {deleteError && (
        <Card style={{ background: colors.dangerSurface, boxShadow: 'none' }}>
          <p style={{ ...styles.errorText, margin: 0 }}>{deleteError}</p>
        </Card>
      )}

      {todayMealsLoading ? (
        <>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton height={18} width="50%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="80%" />
            </Card>
          ))}
        </>
      ) : todayMealsError ? (
        <Card style={{ textAlign: 'center' }}>
          <p style={{ ...styles.errorText, margin: `0 0 ${spacing.md}px` }}>{todayMealsError}</p>
          <AppButton variant="secondary" onClick={refetchTodayMeals}>
            다시 시도
          </AppButton>
        </Card>
      ) : todayMeals.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: `${spacing.xxxl}px ${spacing.xl}px` }}>
          <p style={{ color: colors.textStrong, fontWeight: 700, marginBottom: spacing.sm }}>아직 기록이 없어요</p>
          <p style={{ color: colors.textSub, marginBottom: spacing.lg }}>홈에서 음식을 촬영해보세요.</p>
          <Link
            to="/analyze"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'flex', textDecoration: 'none' }}
          >
            음식 촬영하러 가기
          </Link>
        </Card>
      ) : (
        todayMeals.map((record) => (
          <MealRecordCard
            key={record.id}
            record={record}
            expanded={expandedIds.has(record.id)}
            onToggleDetail={() => toggleDetail(record.id)}
            onRemove={() => handleRemove(record.id)}
            removing={deletingId === record.id}
          />
        ))
      )}
    </div>
  )
}
