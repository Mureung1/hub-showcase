import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import Card from '../components/Card.jsx'
import { NutrientBars } from '../components/NutritionCard.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 나트륨은 "채워야 할 목표"가 아니라 "넘기면 안 되는 한도"라서 막대 색/문구를 반대로 다룬다.
function IntakeBar({ label, unit, actual, recommended, isLimit }) {
  const value = Math.round(actual)
  const percent = recommended > 0 ? Math.min(100, Math.round((actual / recommended) * 100)) : 0
  const remaining = Math.round(recommended - actual)
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
          {value} / {recommended} {unit}
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

function SourceBadge({ source }) {
  const isOfficial = source === '공식'
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: font.size.xs,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: radius.pill,
        background: isOfficial ? colors.primarySurface : colors.bg,
        color: isOfficial ? colors.primary : colors.textSub,
      }}
    >
      {isOfficial ? '공식 영양표' : '추정'}
    </span>
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

function MealCard({ meal, expanded, onToggleDetail, onRemove }) {
  const n = meal.nutrients || {}
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SourceBadge source={meal.source} />
          <h3 style={{ fontSize: font.size.md, margin: `${spacing.sm}px 0 ${spacing.xs}px`, color: colors.textStrong }}>
            {meal.name}
            {meal.brand ? ` (${meal.brand})` : ''}
          </h3>
          <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.xs }}>
            {Math.round(n.calories) || 0}kcal · 단백질 {Math.round(n.protein) || 0}g · 탄수 {Math.round(n.carbs) || 0}g · 지방{' '}
            {Math.round(n.fat) || 0}g · 나트륨 {Math.round(n.sodium) || 0}mg · 식이섬유 {Math.round(n.fiber) || 0}g
          </p>
        </div>
        <button
          type="button"
          className="tds-press"
          onClick={onRemove}
          aria-label={`${meal.name} 삭제`}
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
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <TrashIcon />
        </button>
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
          <NutrientBars nutrients={n} />
        </div>
      )}
    </Card>
  )
}

export default function MealsPage() {
  const { user, todayMeals, todayMealsTotal, removeTodayMeal } = useUser()
  const recommended = user?.recommended
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  function toggleDetail(mealId) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(mealId)) {
        next.delete(mealId)
      } else {
        next.add(mealId)
      }
      return next
    })
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="식단" subtitle="오늘 먹은 음식과 남은 목표를 확인해보세요" />

      {recommended ? (
        <Card>
          <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.lg}px` }}>오늘의 영양 섭취량</h2>
          {NUTRIENT_LABELS.map(({ key, label, unit }) => (
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

      <SectionTitle>오늘 먹은 음식</SectionTitle>
      {todayMeals.length === 0 ? (
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
        todayMeals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            expanded={expandedIds.has(meal.id)}
            onToggleDetail={() => toggleDetail(meal.id)}
            onRemove={() => removeTodayMeal(meal.id)}
          />
        ))
      )}
    </div>
  )
}
