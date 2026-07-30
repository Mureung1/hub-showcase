import { useEffect, useState } from 'react'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import ChevronIcon from './ChevronIcon.jsx'
import ConfidenceBadge from './ConfidenceBadge.jsx'
import FoodNameCorrection from './FoodNameCorrection.jsx'
import MealCardExporter from './MealCardExporter.jsx'
import MealTypePicker from './MealTypePicker.jsx'
import NutrientEditForm from './NutrientEditForm.jsx'
import { NutrientBars } from './NutritionCard.jsx'
import SourceBadge from './SourceBadge.jsx'
import Spinner from './Spinner.jsx'
import { requestFoodServing } from '../lib/foodServing.js'
import {
  formatNutrient,
  NUTRIENT_LABELS,
  scaleMealAnalysisByServings,
  SERVINGS_MAX,
  SERVINGS_MIN,
  SERVINGS_STEP,
} from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 홈 탭 분석 영역의 RESULT 상태 카드. 촬영 카드가 있던 **같은 자리**를 그대로 차지한다 —
// 예전에는 결과가 화면 맨 아래에 따로 생겨서 스크롤을 내려야 보였다.
//
// 카드 안에 헤더(썸네일+요약) / 영양소 막대 / 시간대 선택 / 버튼 두 개가 순서대로 들어간다.
// "언제 드셨어요?"와 저장 버튼도 예전에는 카드 밖 별도 섹션이었지만, 결과를 보고 바로 시간대를 고르고
// 저장하는 흐름이라 한 카드 안에 모았다.

const THUMB_SIZE = 72

// 사진 없이 메뉴 이름만으로 분석한 경우 썸네일 자리에 놓는 식기 아이콘.
function UtensilsPlaceholder() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: radius.sm,
        flexShrink: 0,
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.muted,
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    </div>
  )
}

// 음식이 여러 개면(한 끼 세트) 대표 이름 + 외 N개로 줄인다 — 식단 탭의 SetMealCard와 같은 규칙.
function titleOf(items) {
  if (items.length === 0) return '분석 결과'
  return items.length === 1 ? items[0].name : `${items[0].name} 외 ${items.length - 1}개`
}

function formatServings(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

const STEPPER_BUTTON_STYLE = {
  minWidth: 44,
  minHeight: 44,
  padding: `0 ${spacing.sm}px`,
  borderRadius: radius.sm,
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.textStrong,
  fontSize: font.size.xs,
  fontWeight: 700,
}

// 6주차 §2 — 인분 수 조절. gramHint: servingGram이 매칭된 음식일 때만 "1인분 · 약 300g" 텍스트를
// 보여준다(미매칭이면 표기 생략 — 추측 금지). 음식이 여러 개(한 끼 세트)면 어느 음식 기준인지
// 애매해지므로 호출부가 gramHint를 아예 안 넘긴다.
function ServingsStepper({ servings, onChange, gramHint }) {
  const atMin = servings <= SERVINGS_MIN
  const atMax = servings >= SERVINGS_MAX

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
      <button
        type="button"
        className="tds-press"
        onClick={() => onChange(Math.max(SERVINGS_MIN, servings - SERVINGS_STEP))}
        disabled={atMin}
        aria-label="0.5인분 줄이기"
        style={{ ...STEPPER_BUTTON_STYLE, opacity: atMin ? 0.4 : 1, cursor: atMin ? 'not-allowed' : 'pointer' }}
      >
        −0.5인분
      </button>
      <div style={{ textAlign: 'center', minWidth: 64 }}>
        <div style={{ fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>{formatServings(servings)}인분</div>
        {gramHint != null && (
          <div style={{ fontSize: font.size.xs, color: colors.textSub, marginTop: 2, whiteSpace: 'nowrap' }}>
            1인분 · 약 {gramHint}g
          </div>
        )}
      </div>
      <button
        type="button"
        className="tds-press"
        onClick={() => onChange(Math.min(SERVINGS_MAX, servings + SERVINGS_STEP))}
        disabled={atMax}
        aria-label="0.5인분 늘리기"
        style={{ ...STEPPER_BUTTON_STYLE, opacity: atMax ? 0.4 : 1, cursor: atMax ? 'not-allowed' : 'pointer' }}
      >
        +0.5인분
      </button>
    </div>
  )
}

// precisionEngine(급식·학식 정밀 분석)의 항목별 매칭 방식 — 사진/텍스트/라벨 분석 경로에서 온
// 항목은 matchType이 없어(null) 아무것도 그리지 않는다.
const MATCH_TYPE_LABELS = {
  exact: '정확히 일치',
  alias: '다른 이름으로 일치',
  partial: '부분 일치',
  fuzzy: '비슷한 이름으로 추정',
}

// 펼쳤을 때 보여주는 음식 하나. 식단 탭의 MealItemRow와 같은 생김새를 쓰되, 여기서는 저장 전에
// "이 음식이 이렇게 잡혔구나"를 확인하는 자리라 한 줄 요약이 아니라 영양소 막대까지 펼쳐 보여준다.
function ItemDetailRow({ item }) {
  const matchTypeLabel = MATCH_TYPE_LABELS[item.matchType]
  return (
    <div style={{ paddingTop: spacing.md, marginTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
      <div style={{ marginBottom: spacing.xs, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <SourceBadge source={item.source} />
        {matchTypeLabel && <span style={{ fontSize: font.size.xs, color: colors.muted }}>{matchTypeLabel}</span>}
      </div>
      <h4 style={{ fontSize: font.size.md, margin: `0 0 ${spacing.md}px`, color: colors.textStrong }}>
        {item.name}
        {item.brand ? ` (${item.brand})` : ''}
      </h4>
      <NutrientBars nutrients={item.nutrients} />
    </div>
  )
}

export default function AnalysisResultCard({
  analysis,
  photoUrl,
  mealType,
  recommendedMealType,
  onMealTypeChange,
  onSave,
  onRetake,
  saving,
  // 한 판 통합 분석(5주차 §3-B) 전용 — 둘 다 생략하면 기존 사진/텍스트 분석과 완전히 동일하게 동작한다.
  // titleOverride: titleOf(items) 대신 쓸 표시 이름("중식(통합)" 등). items·저장 데이터는 그대로다.
  // sourceNote: 합계 kcal 아래에 붙는 작은 안내("공식 영양정보 기준" | "추정") — NEIS 공식 열량을
  // 썼는지, 전부 AI 추정인지 구분해준다.
  titleOverride,
  sourceNote,
  // 판 단위 검증 경고 문구(src/lib/mealStandards.js). 합계가 그 장면의 현실 범위를 벗어났을 때만
  // 채워지고, **수치는 그대로 둔다** — 정답지 없이 밴드로 값을 깎지 않는다는 원칙 때문이다.
  plateWarning,
  // 트랙 2 §2 — precisionEngine이 이미 계산해 돌려주던 신뢰도(high/medium/low). 사진/텍스트/라벨
  // 분석 경로에서는 undefined라 ConfidenceBadge가 아무것도 그리지 않는다(기존 화면과 동일).
  confidence,
  // 6주차 §2 — 인분 수 조절(둘 다 생략하면 1인분 고정으로 기존과 동일하게 동작).
  // analysis는 항상 1인분(baseNutrients) 기준 그대로 두고, 화면 표시만 servings배로 계산한다 —
  // "원본을 덮어쓰지 않는다"는 PRD 규칙의 핵심이라 여기(표시 전용 파생값)에서만 배율을 곱한다.
  servings = 1,
  onServingsChange,
  // 트랙 2 §4 — 저장 전 수동 보정. (itemIndex, baseNutrients) => void. baseNutrients는 항상 1인분
  // 기준(analysis가 그렇듯)으로 넘긴다 — 호출부가 servings 배율을 이미 나눠서 넘겨준다.
  // 생략하면(기존 호출부와 동일) "직접 수정" 진입점 자체가 보이지 않는다.
  onEditNutrients,
  // 조리법 1탭 보정. { searchName, matchedName, busy, onCorrect(method) } — 생략하면 줄 자체가
  // 안 보인다. 호출부가 "DB 매칭이 확실하지 않은 단일 음식"일 때만 넘긴다(잘 맞은 결과 밑에
  // "고쳐보세요"가 붙으면 맞는 값을 의심하게 만든다).
  correction,
}) {
  const { items } = analysis
  const displayAnalysis = scaleMealAnalysisByServings(analysis, servings)
  const title = titleOverride || titleOf(items)
  // 음식이 2개 이상일 때만 펼치기를 준다 — 1개면 위의 합계 막대가 곧 그 음식의 막대라 똑같은 내용이
  // 두 번 나온다. 기본은 접힘: 결과 카드가 촬영 카드 자리를 대신하는 만큼, 처음엔 합계만 보여 한눈에
  // 들어오게 하고 필요한 사람만 펼치게 한다.
  const [expanded, setExpanded] = useState(false)
  const canExpand = items.length > 1
  // 음식이 여러 개면 총합을 어느 항목에 얼마나 반영할지 정할 근거가 없어 수정 자체를 막는다.
  const canEdit = items.length === 1 && Boolean(onEditNutrients)
  const [editing, setEditing] = useState(false)

  // 음식이 1개일 때만 그 음식의 1인분 기준량을 물어본다 — 여러 개면 어느 음식 기준인지 애매하다.
  // 결과가 바뀔 때(다시 찍기 등)마다 다시 조회하고, 매칭 안 되면(null) 힌트를 아예 숨긴다.
  const [gramHint, setGramHint] = useState(null)
  // FR-2 — 사진이 있을 때만("메뉴 이름만" 텍스트 분석엔 사진이 없다). AnalysisResultCard는 저장
  // 성공과 동시에 언마운트되므로(Analyze.jsx의 resetToIdle), "저장 후" 전용 화면을 따로 만들지 않고
  // 이 카드가 떠 있는 동안 바로 만들 수 있게 한다.
  const [showExporter, setShowExporter] = useState(false)
  useEffect(() => {
    setGramHint(null)
    if (items.length !== 1 || !onServingsChange) return
    let cancelled = false
    requestFoodServing(items[0].name)
      .then((res) => {
        if (!cancelled && res.matched && res.servingGram) setGramHint(res.servingGram)
      })
      .catch(() => {}) // 힌트는 부가 정보라 실패해도 조용히 생략(카드 자체는 정상 동작)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items[0]?.name, items.length])

  return (
    <Card className="tds-card-swap">
      {/* a. 헤더 — 올렸던 사진 + 출처/음식명/총 칼로리 */}
      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="분석한 음식 사진"
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: radius.sm,
              objectFit: 'cover',
              flexShrink: 0,
              display: 'block',
            }}
          />
        ) : (
          <UtensilsPlaceholder />
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
            <SourceBadge source={items[0]?.source} />
            <ConfidenceBadge confidence={confidence} />
          </div>
          <h3
            style={{
              margin: `${spacing.xs}px 0 2px`,
              fontSize: font.size.lg,
              color: colors.textStrong,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
            총 <strong style={{ color: colors.textStrong }}>{formatNutrient(displayAnalysis.total.calories)}</strong> kcal
          </p>
          {sourceNote && <p style={{ margin: '2px 0 0', fontSize: font.size.xs, color: colors.muted }}>{sourceNote}</p>}
          {/* 판 단위 검증 — 합계가 그 장면의 현실 범위를 벗어났을 때만. 값을 자동으로 고치지 않고
              알리기만 하므로(mealStandards.js 참고), 사용자가 직접 수정하거나 다시 찍을 수 있게 한다. */}
          {plateWarning && (
            <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.deficientText, lineHeight: 1.4 }}>
              {plateWarning}
            </p>
          )}
          {photoUrl && (
            <button
              type="button"
              className="tds-press"
              onClick={() => setShowExporter(true)}
              style={{ ...styles.linkButton, marginTop: spacing.xs, fontSize: font.size.xs }}
            >
              인증샷 카드 만들기 📸
            </button>
          )}
        </div>
      </div>

      {showExporter && (
        <MealCardExporter
          photoUrl={photoUrl}
          mealTotal={displayAnalysis.total}
          onClose={() => setShowExporter(false)}
        />
      )}

      {/* a-2. 인분 수 조절(6주차 §2) — onServingsChange가 있을 때만(생략하면 기존과 동일하게 숨김) */}
      {onServingsChange && (
        <div style={{ marginTop: spacing.lg }}>
          <ServingsStepper servings={servings} onChange={onServingsChange} gramHint={gramHint} />
        </div>
      )}

      {/* b. 영양소 막대 — 음식이 여러 개면 통합(합계) 기준. 하단에 따로 있던 카드와 같은 컴포넌트 재사용 */}
      <div style={{ marginTop: spacing.xl }}>
        {canExpand && (
          <p style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.xs, color: colors.muted }}>
            {items.length}가지 음식을 합친 값이에요
          </p>
        )}
        {editing ? (
          <NutrientEditForm
            key={servings}
            nutrients={displayAnalysis.total}
            onCancel={() => setEditing(false)}
            onSave={(next) => {
              // 화면엔 인분 배율이 이미 적용된 값이 보이므로, analysis(1인분 기준) 상태에 반영하려면
              // 현재 servings로 나눠 되돌려야 한다.
              const base = Object.fromEntries(NUTRIENT_LABELS.map(({ key }) => [key, next[key] / servings]))
              onEditNutrients(0, base)
              setEditing(false)
            }}
          />
        ) : (
          <>
            <NutrientBars nutrients={displayAnalysis.total} />
            {canEdit && (
              <button
                type="button"
                className="tds-press"
                onClick={() => setEditing(true)}
                style={{ ...styles.linkButton, marginTop: spacing.sm }}
              >
                직접 수정
              </button>
            )}
          </>
        )}
      </div>

      {/* b-1. 조리법 보정 — 호출부가 correction을 줄 때만 보인다(= DB 매칭이 확실하지 않은 단일 음식).
          "직접 수정"이 결과 수치를 손으로 덮어쓰는 것과 달리, 이건 **검색어를 고쳐 DB를 다시 조회**한다 —
          사용자가 아는 건 영양수치가 아니라 자기가 먹은 음식이므로 이쪽이 물어보기 쉬운 질문이다. */}
      {correction && !editing && (
        <FoodNameCorrection
          searchName={correction.searchName}
          matchedName={correction.matchedName}
          busy={correction.busy}
          onCorrect={correction.onCorrect}
        />
      )}

      {/* b-2. 음식별 상세 — 여러 개일 때만. 기본 접힘, "자세한 식사"로 펼친다. */}
      {canExpand && (
        <>
          <button
            type="button"
            className="tds-press"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              ...styles.linkButton,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              marginTop: spacing.xs,
            }}
          >
            {expanded ? '접기' : '자세한 식사'}
            <ChevronIcon open={expanded} />
          </button>

          {expanded && (
            <div className="tds-card-swap">
              {displayAnalysis.items.map((item, i) => (
                <ItemDetailRow key={item.id ?? `${item.name}-${i}`} item={item} />
              ))}
            </div>
          )}
        </>
      )}

      {/* c. 시간대 선택 — 저장에 함께 실리는 값이라 저장 버튼 바로 위에 둔다 */}
      <div style={{ marginTop: spacing.lg }}>
        <h4 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
          언제 드셨어요?
        </h4>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
          시간대를 선택하면 식단 기록에 함께 표시돼요.
        </p>
        <MealTypePicker value={mealType} recommended={recommendedMealType} onChange={onMealTypeChange} />
      </div>

      {/* d. 저장(주) / 다시 찍기(보조) — 한 화면에 채워진 주 버튼은 하나만 둔다 */}
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.xl }}>
        <AppButton onClick={onSave} disabled={saving} style={{ flex: 6 }}>
          {saving && <Spinner size={16} />}
          {saving ? '저장 중...' : '저장하기'}
        </AppButton>
        <AppButton variant="outline" onClick={onRetake} disabled={saving} style={{ flex: 4 }}>
          다시 찍기
        </AppButton>
      </div>
    </Card>
  )
}
