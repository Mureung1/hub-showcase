// 하루 영양 섭취 "달성률" 점수(0~100) 계산 — 오늘의 순위/점수 카드 공용 순수 함수.
// 나트륨은 상한(넘지 않을수록 좋음) 지표라, 목표에 가까울수록 좋은 나머지 5개와 반대 방향으로 채점한다.
// 두 방향 모두 [0, 100]으로 잘라, "과다 섭취인데 오히려 점수가 더 좋아 보이는" 역전 현상이 생기지 않게 한다
// (예: 단백질을 목표의 300% 먹었다고 300점이 되거나, 나트륨을 한도의 300%를 먹었는데 음수라서 그래프가
// 이상해지는 경우 방지).
import { NUTRIENT_LABELS } from './nutrition.js'

const LIMIT_NUTRIENTS = new Set(['sodium'])

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function nutrientScore(key, actual, target) {
  if (!(target > 0)) return null
  if (LIMIT_NUTRIENTS.has(key)) {
    if (actual <= target) return 100
    return clamp(100 * (1 - (actual - target) / target), 0, 100)
  }
  return clamp((actual / target) * 100, 0, 100)
}

// actual/target: NutrientSet(6개 키). 6개 영양소 채점 점수의 단순 평균(정수, 0~100)을 반환한다.
// target에 유효한 값이 없는 영양소는 채점에서 제외하고, 채점 가능한 항목이 하나도 없으면 null을 반환한다.
export function calcNutritionScore(actual, target) {
  const scores = NUTRIENT_LABELS.map(({ key }) => nutrientScore(key, Number(actual?.[key]) || 0, Number(target?.[key]) || 0)).filter(
    (score) => score !== null,
  )
  if (scores.length === 0) return null
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}
