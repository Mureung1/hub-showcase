import { datingScoreMap } from '../data/datingScoreMap.js'

// 4가지 이상형 유형 (고정 순서 — 동점 처리 시 최후 기준으로도 사용)
const DATING_TYPES = ['포근메이트', '티키타카러', '하트스파커', '그로우파트너']

// 동점 처리 기준이 되는 4지선다 문항 번호 (2지선다 문항 3, 4번은 제외)
const SINGLE_CHOICE_QUESTION_IDS = [1, 2, 5, 6, 7]

// 이상형 테스트 답변({ 문항id: 선택지id })을 받아 타입별 점수와 주/보조 유형을 계산하는 순수 함수
export function calculateDatingScore(rawAnswers) {
  // 1. 타입별 점수를 0으로 초기화
  const scores = Object.fromEntries(DATING_TYPES.map((type) => [type, 0]))

  // 2. 각 답변의 선택지를 datingScoreMap에서 찾아 주타입 +2점, 보조타입 +1점을 더한다
  for (const optionId of Object.values(rawAnswers)) {
    const scoreEntry = datingScoreMap[optionId]
    if (!scoreEntry) continue
    scores[scoreEntry.twoPointType] += 2
    scores[scoreEntry.onePointType] += 1
  }

  // 3. 동점 처리용: 4지선다 문항에서 각 타입이 "주타입(2점)"으로 선택된 횟수를 센다
  const twoPointCounts = Object.fromEntries(DATING_TYPES.map((type) => [type, 0]))
  for (const questionId of SINGLE_CHOICE_QUESTION_IDS) {
    const optionId = rawAnswers[questionId]
    const scoreEntry = optionId && datingScoreMap[optionId]
    if (!scoreEntry) continue
    twoPointCounts[scoreEntry.twoPointType] += 1
  }

  // 4. 총점 → 4지선다 주타입 횟수 → 타입 고정 순서 순으로 비교해 순위를 매긴다
  const rankedTypes = [...DATING_TYPES].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a]
    if (twoPointCounts[b] !== twoPointCounts[a]) return twoPointCounts[b] - twoPointCounts[a]
    return DATING_TYPES.indexOf(a) - DATING_TYPES.indexOf(b)
  })

  return { scores, primary: rankedTypes[0], secondary: rankedTypes[1] }
}
