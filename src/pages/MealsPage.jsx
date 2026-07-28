import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import DeficientNutrientAds from '../components/DeficientNutrientAds.jsx'
import LeaderboardCard from '../components/LeaderboardCard.jsx'
import MealTypeBadge from '../components/MealTypeBadge.jsx'
import NationalComparisonCard from '../components/NationalComparisonCard.jsx'
import NutrientEditForm from '../components/NutrientEditForm.jsx'
import { NutrientBars } from '../components/NutritionCard.jsx'
import ProgressBarFill from '../components/ProgressBarFill.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import Skeleton from '../components/Skeleton.jsx'
import SourceBadge from '../components/SourceBadge.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { applyManualNutrientEdit } from '../lib/mealEdit.js'
import { isSetMeal, sumNutrients } from '../lib/mealStore.js'
import { isLimitNutrient } from '../lib/nutrientCriteria.js'
import { formatNutrient, formatNutrientOrDash, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { buildRelogNavState } from '../lib/relog.js'
import { TABS } from '../lib/tabs.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
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
    // 막대 채우기(barColor)는 원래 톤을 유지하고, 텍스트(statusColor)만 대비가 확보된 톤을 쓴다.
    statusColor = over ? colors.dangerText : colors.muted
  } else if (over || remaining === 0) {
    barColor = colors.satisfied
    statusText = over ? `달성 · +${-remaining}${unit}` : '달성했어요'
    statusColor = colors.satisfied
  } else {
    barColor = colors.deficient
    statusText = `${remaining}${unit} 더 필요해요`
    statusColor = colors.deficientText
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
        <ProgressBarFill percent={percent} color={barColor} />
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

// 클릭하면 바로 지우지 않고 ConfirmDialog를 여는 트리거일 뿐이라 자체 로딩 상태를 갖지 않는다
// (실제 삭제는 다이얼로그의 confirmRemove가 처리하고, 그동안은 다이얼로그 오버레이가 화면을 덮는다).
function DeleteButton({ onClick, label }) {
  return (
    <button
      type="button"
      className="tds-press"
      onClick={onClick}
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
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <TrashIcon />
    </button>
  )
}

// 다시 기록(트랙 2 §3) — 저장된 items(baseNutrients·servings 포함)를 그대로 /analyze의 결과 카드로
// 되돌려 원탭으로 재저장할 수 있게 한다. API 호출이 전혀 없어(prefillTrayAnalysis 재사용) 공유
// Gemini 리미터와 무관하다 — Cal AI에서 가장 많이 복제되는 기능이 여기선 사실상 공짜다.
function RelogButton({ onClick }) {
  return (
    <button type="button" className="tds-press" onClick={onClick} style={styles.linkButton}>
      다시 기록
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

// 저장 시점의 인분 수(6주차 §2) — 1인분이면 굳이 표시하지 않는다. 구버전 기록(servings 없음)은
// undefined라 그냥 표시를 생략(= 1인분 취급, 마이그레이션 없음).
function servingsSuffix(servings) {
  if (typeof servings !== 'number' || servings === 1) return ''
  return ` · ${Number.isInteger(servings) ? servings : servings.toFixed(1)}인분`
}

// 저장 시각(트랙 2 §1) — 매 저장마다 createdAt이 기록되지만 지금까지 어느 화면도 보여준 적이 없다.
// 구버전 기록(createdAt 없음)은 조용히 생략한다.
function formatMealTime(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
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
        {servingsSuffix(item.servings)}
      </h4>
      <NutrientSummaryLine nutrients={item.nutrients} />
    </div>
  )
}

// 단일 메뉴 끼니: 음식이 1개뿐이라 기존과 동일하게 카드 하나 + "자세한 영양"(막대 그래프) 토글로 보여준다.
// isEditing/onStartEdit/onCancelEdit/onSaveEdit: 저장된 기록 수정(트랙 2 §5) — 음식이 여러 개(한 끼
// 세트, SetMealCard)면 어느 항목에 얼마나 반영할지 정할 근거가 없어 단일 메뉴에만 지원한다.
function SingleMealCard({ record, expanded, onToggleDetail, onRemove, onRelog, isEditing, onStartEdit, onCancelEdit, onSaveEdit, savingEdit }) {
  const item = record.items[0]
  const mealTime = formatMealTime(record.createdAt)

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
            <SourceBadge source={item.source} />
            <MealTypeBadge mealType={record.mealType} />
            {mealTime && <span style={{ fontSize: font.size.xs, color: colors.muted }}>{mealTime}</span>}
          </div>
          <h3 style={{ fontSize: font.size.md, margin: `${spacing.sm}px 0 ${spacing.xs}px`, color: colors.textStrong }}>
            {item.name}
            {item.brand ? ` (${item.brand})` : ''}
            {servingsSuffix(item.servings)}
          </h3>
          {!isEditing && <NutrientSummaryLine nutrients={item.nutrients} />}
        </div>
        <DeleteButton onClick={onRemove} label={item.name} />
      </div>

      {isEditing ? (
        <div style={{ marginTop: spacing.md }}>
          <NutrientEditForm nutrients={item.nutrients} onCancel={onCancelEdit} onSave={onSaveEdit} saving={savingEdit} />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, flexWrap: 'wrap', gap: spacing.sm }}>
            <button type="button" className="tds-press" onClick={onToggleDetail} aria-expanded={expanded} style={styles.linkButton}>
              {expanded ? '접기' : '자세한 영양'}
            </button>
            <div style={{ display: 'flex', gap: spacing.md }}>
              <button type="button" className="tds-press" onClick={onStartEdit} style={styles.linkButton}>
                수정
              </button>
              <RelogButton onClick={onRelog} />
            </div>
          </div>

          {expanded && (
            <div style={{ marginTop: spacing.md }}>
              <NutrientBars nutrients={item.nutrients} />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// 다중 메뉴 끼니(한 끼 세트): 학식·급식처럼 한 번에 여러 음식을 찍은 경우, 개별 카드로 흩어놓지 않고
// "대표 음식명 + 외 N개" 제목 + 끼니 전체 합계로 먼저 요약하고, "자세한 식사"로 펼쳐야 개별 음식이 보인다.
function SetMealCard({ record, expanded, onToggleDetail, onRemove, onRelog }) {
  const total = sumNutrients(record.items)
  const title = `${record.items[0].name} 외 ${record.items.length - 1}개`
  const mealTime = formatMealTime(record.createdAt)

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
            <MealTypeBadge mealType={record.mealType} />
            {mealTime && <span style={{ fontSize: font.size.xs, color: colors.muted }}>{mealTime}</span>}
          </div>
          <h3 style={{ fontSize: font.size.md, margin: `${spacing.sm}px 0 ${spacing.xs}px`, color: colors.textStrong }}>{title}</h3>
          <NutrientSummaryLine nutrients={total} />
        </div>
        <DeleteButton onClick={onRemove} label={title} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.md }}>
        <button type="button" className="tds-press" onClick={onToggleDetail} aria-expanded={expanded} style={styles.linkButton}>
          {expanded ? '접기' : '자세한 식사'}
        </button>
        <RelogButton onClick={onRelog} />
      </div>

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

function MealRecordCard({
  record,
  expanded,
  onToggleDetail,
  onRemove,
  onRelog,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  savingEdit,
}) {
  return isSetMeal(record) ? (
    <SetMealCard record={record} expanded={expanded} onToggleDetail={onToggleDetail} onRemove={onRemove} onRelog={onRelog} />
  ) : (
    <SingleMealCard
      record={record}
      expanded={expanded}
      onToggleDetail={onToggleDetail}
      onRemove={onRemove}
      onRelog={onRelog}
      isEditing={isEditing}
      onStartEdit={onStartEdit}
      onCancelEdit={onCancelEdit}
      onSaveEdit={onSaveEdit}
      savingEdit={savingEdit}
    />
  )
}

// 삭제 확인 모달에 넣을 제목 한 줄 — SetMealCard/SingleMealCard가 각자 그리는 제목과 같은 규칙.
function recordTitle(record) {
  return isSetMeal(record) ? `${record.items[0].name} 외 ${record.items.length - 1}개` : record.items[0].name
}

export default function MealsPage() {
  useDocumentTitle(TABS.find((t) => t.key === 'meals').label)
  const {
    todayMeals,
    todayMealsTotal,
    todayMealsLoading,
    todayMealsError,
    refetchTodayMeals,
    removeTodayMeal,
    updateTodayMeal,
    effectiveRecommended,
  } = useUser()
  const recommended = effectiveRecommended
  const { showToast } = useToast()
  const navigate = useNavigate()
  const visible = useVisibleNutrients()
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [deletingId, setDeletingId] = useState(null)
  // 삭제 확인 대기 중인 끼니 — { id, title } | null. 클릭 즉시 지우지 않고 ConfirmDialog로 한 번 더
  // 확인받는다(끼니 삭제는 되돌릴 수 없는 파괴적 동작이라 되돌리기를 지원하지 않는 대신 확인 단계를 둔다).
  const [pendingDelete, setPendingDelete] = useState(null)
  // 트랙 2 §5 — 지금 수정 중인 끼니 id. 한 번에 하나만 편집한다(여러 카드를 동시에 열면 실수로 다른
  // 카드를 저장할 위험이 있다).
  const [editingId, setEditingId] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

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

  async function confirmRemove() {
    if (!pendingDelete) return
    const { id, title } = pendingDelete
    setDeletingId(id)
    try {
      await removeTodayMeal(id)
      setPendingDelete(null)
      showToast(`${title} · 삭제했어요`, { tone: 'success' })
    } catch (err) {
      // 실패 메시지는 목록 위 카드가 아니라 토스트로 알린다 — 목록 아래쪽 항목을 지우면 카드가
      // 화면 밖(스크롤 위)에 떠서 실패해도 아무 반응이 없는 것처럼 보이던 문제였다.
      showToast(err.message || '삭제에 실패했어요. 잠시 후 다시 시도해주세요.', { tone: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  // 트랙 2 §5 — 저장된 기록 수정. record는 항상 단일 메뉴(SingleMealCard)만 여기로 들어온다
  // (MealRecordCard가 한 끼 세트엔 편집 진입점 자체를 안 그린다).
  async function handleSaveEdit(record, nextNutrients) {
    setSavingEdit(true)
    try {
      const items = [applyManualNutrientEdit(record.items[0], nextNutrients)]
      await updateTodayMeal(record.id, items)
      setEditingId(null)
      showToast('수정했어요', { tone: 'success' })
    } catch (err) {
      showToast(err.message || '수정에 실패했어요. 잠시 후 다시 시도해주세요.', { tone: 'error' })
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* 화면 제목("식단")과 설명 줄은 두지 않는다 — 하단 탭바가 이미 현재 화면을 알려주므로
          중복이고, 그만큼 첫 카드를 위로 올려 한 화면에 담기는 정보를 늘린다. */}
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
              isLimit={isLimitNutrient(key)}
            />
          ))}
          {todayMeals.length > 0 && (
            <Link
              to="/result"
              className="tds-press"
              style={{ ...styles.linkButton, display: 'block', textAlign: 'center', marginTop: spacing.md }}
            >
              오늘의 영양 진단 보기
            </Link>
          )}
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
            onRemove={() => setPendingDelete({ id: record.id, title: recordTitle(record) })}
            onRelog={() => navigate('/analyze', { state: buildRelogNavState(record) })}
            isEditing={editingId === record.id}
            onStartEdit={() => setEditingId(record.id)}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={(nextNutrients) => handleSaveEdit(record, nextNutrients)}
            savingEdit={savingEdit}
          />
        ))
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="끼니를 삭제할까요?"
          description={`${pendingDelete.title} · 삭제하면 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          busy={deletingId === pendingDelete.id}
          onConfirm={confirmRemove}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
