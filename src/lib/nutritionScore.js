// 하루 영양 섭취 점수(0~100) — "오늘의 점수/순위" 카드 공용 순수 함수 (5주차 §4 개편).
//
// 앱이 실제로 추적하는 5개 영양소(칼로리·단백질·탄수화물·지방·나트륨)만으로 채점한다. 비타민D·칼슘
// 같은 미량영양소는 광고 캐러셀 폴백에만 존재하는 데이터라 실제 섭취량이 없고, 식이섬유는 카드
// 표시 항목으로는 남아 있지만 점수 배점표에서는 뺐다 — 표시되는 모든 점수가 실측 섭취 데이터에
// 근거하게 하기 위한 결정(사용자 확인 후 반영).
//
// 배점: 칼로리 적정성 40 / 단백질·탄수화물·지방 각 10(합 30) / 나트륨 30 = 100.
// 칼로리는 과다·과소 둘 다 감점되는 "적정성" 지표(목표의 90~110%면 만점, 50%/150%에서 0점)로,
// 나트륨은 상한(넘지 않을수록 좋음) 지표로, 나머지 3개는 목표 달성률(최대 100%에서 만점)로 채점한다.
//
// supabase/schema.sql의 get_daily_leaderboard()가 이 공식을 SQL로 동일하게 구현한다 — 둘 중
// 하나만 고치면 개인 점수 표시와 리더보드 순위가 어긋나니, 채점 공식을 바꿀 때는 항상 같이 고치고
// schema.sql을 Supabase 프로젝트에 재적용해야 한다.

export const SCORE_WEIGHTS = {
  calories: 40,
  protein: 10,
  carbs: 10,
  fat: 10,
  sodium: 30,
}

// 칼로리 "적정" 구간(목표 대비 비율) — 이 안이면 만점, 벗어나면 ZERO_AT 지점까지 선형 감점.
const CALORIE_BAND = { min: 0.9, max: 1.1 }
const CALORIE_ZERO_AT = { min: 0.5, max: 1.5 }

// 상태 판정 기준(획득/배점 비율) — 색+아이콘+텍스트 3중 표시용.
const STATUS_THRESHOLDS = { good: 0.9, warn: 0.5 }

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function calorieScore(actual, target, maxPoints) {
  const ratio = actual / target
  if (ratio >= CALORIE_BAND.min && ratio <= CALORIE_BAND.max) return maxPoints
  if (ratio < CALORIE_BAND.min) {
    const fraction = (ratio - CALORIE_ZERO_AT.min) / (CALORIE_BAND.min - CALORIE_ZERO_AT.min)
    return clamp(fraction, 0, 1) * maxPoints
  }
  const fraction = (CALORIE_ZERO_AT.max - ratio) / (CALORIE_ZERO_AT.max - CALORIE_BAND.max)
  return clamp(fraction, 0, 1) * maxPoints
}

function achievementScore(actual, target, maxPoints) {
  return clamp((actual / target) * maxPoints, 0, maxPoints)
}

function sodiumScore(actual, target, maxPoints) {
  if (actual <= target) return maxPoints
  return clamp(maxPoints * (1 - (actual - target) / target), 0, maxPoints)
}

function formatAmount(n) {
  return Math.round(n).toLocaleString('ko-KR')
}

const SCORE_ROWS = [
  { key: 'calories', label: '칼로리 적정성', unit: 'kcal', maxPoints: SCORE_WEIGHTS.calories, score: calorieScore },
  { key: 'protein', label: '단백질', unit: 'g', maxPoints: SCORE_WEIGHTS.protein, score: achievementScore },
  { key: 'carbs', label: '탄수화물', unit: 'g', maxPoints: SCORE_WEIGHTS.carbs, score: achievementScore },
  { key: 'fat', label: '지방', unit: 'g', maxPoints: SCORE_WEIGHTS.fat, score: achievementScore },
  { key: 'sodium', label: '나트륨', unit: 'mg', maxPoints: SCORE_WEIGHTS.sodium, score: sodiumScore },
]

function statusOf(ratio) {
  if (ratio >= STATUS_THRESHOLDS.good) return 'good'
  if (ratio >= STATUS_THRESHOLDS.warn) return 'warn'
  return 'bad'
}

function criterionText(key, unit, actual, target, withinLimit) {
  const pct = Math.round((actual / target) * 100)
  if (key === 'sodium') {
    return withinLimit
      ? `권장 ${formatAmount(target)}${unit} 이내로 섭취했어요.`
      : `권장 ${formatAmount(target)}${unit} 대비 ${pct}% 섭취`
  }
  if (key === 'calories') {
    return `목표 ${formatAmount(target)}${unit} 대비 ${pct}% 섭취`
  }
  return `권장 ${formatAmount(target)}${unit} 대비 ${pct}% 섭취(${formatAmount(actual)}${unit})`
}

// actual/target: NutrientSet(6개 키 중 5개만 채점에 사용). target에 유효한 값(>0)이 있는 항목만
// 배열에 포함된다 — 프로필이 없어 target 전체가 비어 있으면 빈 배열을 반환한다.
export function getScoreBreakdown(actual, target) {
  return SCORE_ROWS.map(({ key, label, unit, maxPoints, score }) => {
    const t = Number(target?.[key]) || 0
    if (!(t > 0)) return null
    const a = Number(actual?.[key]) || 0
    const points = Math.round(clamp(score(a, t, maxPoints), 0, maxPoints))
    return {
      key,
      label,
      status: statusOf(points / maxPoints),
      points,
      maxPoints,
      // sodium 문구는 반올림된 points(>= maxPoints)가 아니라 실제 섭취량 vs 한도를 직접 비교한다 —
      // target=2000/actual=2001처럼 점수는 반올림으로 만점(30)이 나와도 실제로는 한도를 넘었으므로
      // "이내로 섭취했어요"라고 하면 안 된다.
      criterion: criterionText(key, unit, a, t, a <= t),
    }
  }).filter(Boolean)
}

// breakdown 각 행의 points 합계와 항상 정확히 같다(배점표 합이 100이라 채점 가능 항목이 전부
// 있으면 그대로 0~100점, 일부만 있으면 그만큼 낮은 만점 기준으로 합산된다).
export function calcScore(actual, target) {
  const breakdown = getScoreBreakdown(actual, target)
  if (breakdown.length === 0) return null
  return breakdown.reduce((sum, row) => sum + row.points, 0)
}
