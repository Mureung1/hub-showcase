// FR-17 — 식단 퀴즈 & 밸런스게임의 순수 로직(문제 선택/보기 구성). 서버 조회(/api/quiz/calorie-neighbors)
// 결과를 받은 뒤 이 함수들로 오늘의 문제·보기 순서를 결정적으로 만든다 — 같은 (userId, dateKey)면
// 항상 같은 문제·같은 보기 순서가 나온다(quests.js의 로테이션 선택과 동일한 hashString 기반 결정성).
import { hashString } from './hashString.js'

export function pickTodayQuizFood(pool, userId, dateKey) {
  if (!pool || pool.length === 0) return null
  const index = hashString(`${userId}:${dateKey}:quiz`) % pool.length
  return pool[index]
}

function pickN(pool, n, seed) {
  return pool
    .map((item, i) => ({ item, key: hashString(`${seed}:pick:${i}:${item.name}`) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, n)
    .map((entry) => entry.item)
}

function shuffle(items, seed) {
  return items
    .map((item, i) => ({ item, key: hashString(`${seed}:shuffle:${i}:${item}`) }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.item)
}

// neighbors/farOptions: /api/quiz/calorie-neighbors 응답의 {name,calories}[] — 정답은 근접 후보 중
// 가장 가까운 1개, 오답 3개는 원거리 후보 중 시드 기반으로 결정적으로 고른다.
export function buildQuizChoices(neighbors, farOptions, seed) {
  if (!neighbors?.length || !farOptions || farOptions.length < 3) return null
  const correctName = neighbors[0].name
  const wrongNames = pickN(farOptions, 3, seed).map((c) => c.name)
  const choices = shuffle([correctName, ...wrongNames], seed)
  const correctIndex = choices.indexOf(correctName)
  return { choices, correctIndex }
}
