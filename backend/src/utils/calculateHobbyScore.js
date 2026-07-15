import { hobbyScoreMap } from '../data/hobbyScoreMap.js'

// 4가지 취미 유형 (고정 순서 — 동점 처리 시 최후 기준으로도 사용)
const HOBBY_TYPES = ['딥다이버', '에너지러', '무드트래블러', '소셜메이커']

// 동점 처리 기준이 되는 4지선다 문항 번호 (O/X 문항 3, 5, 8번은 제외)
const SINGLE_CHOICE_QUESTION_IDS = [1, 2, 4, 6, 7]

// 취미 발견 테스트 답변({ 문항id: 선택지id })을 받아 타입별 점수와 주/보조 유형을 계산하는 순수 함수
export function calculateHobbyScore(rawAnswers) {
  // 1. 타입별 점수를 0으로 초기화
  const scoreSummary = Object.fromEntries(HOBBY_TYPES.map((type) => [type, 0]))

  // 2. 각 답변의 선택지를 hobbyScoreMap에서 찾아 주타입 +2점, 보조타입 +1점을 더한다
  for (const optionId of Object.values(rawAnswers)) {
    const scoreEntry = hobbyScoreMap[optionId]
    if (!scoreEntry) continue
    scoreSummary[scoreEntry.twoPointType] += 2
    scoreSummary[scoreEntry.onePointType] += 1
  }

  // 3. 동점 처리용: 4지선다 문항에서 각 타입이 "주타입(2점)"으로 선택된 횟수를 센다
  const twoPointCounts = Object.fromEntries(HOBBY_TYPES.map((type) => [type, 0]))
  for (const questionId of SINGLE_CHOICE_QUESTION_IDS) {
    const optionId = rawAnswers[questionId]
    const scoreEntry = optionId && hobbyScoreMap[optionId]
    if (!scoreEntry) continue
    twoPointCounts[scoreEntry.twoPointType] += 1
  }

  // 4. 총점 → 4지선다 주타입 횟수 → 타입 고정 순서 순으로 비교해 순위를 매긴다
  const rankedTypes = [...HOBBY_TYPES].sort((a, b) => {
    if (scoreSummary[b] !== scoreSummary[a]) return scoreSummary[b] - scoreSummary[a]
    if (twoPointCounts[b] !== twoPointCounts[a]) return twoPointCounts[b] - twoPointCounts[a]
    return HOBBY_TYPES.indexOf(a) - HOBBY_TYPES.indexOf(b)
  })

  const hobbyTags = { primary: rankedTypes[0], secondary: rankedTypes[1] }

  return { scoreSummary, hobbyTags }
}
