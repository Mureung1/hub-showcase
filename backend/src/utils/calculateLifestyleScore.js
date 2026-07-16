import { lifestyleScoreMap } from '../data/lifestyleScoreMap.js'

// 생활성향 4가지 유형 (고정 순서 — 동점 처리 시 최후 기준으로도 사용)
const LIFESTYLE_TYPES = ['깔끔루틴러', '함께루틴러', '여유마이웨이', '편한동거러']

// 점수 반영 문항 번호 (lifestyleQuestions.js의 group: 'score', 1~6번 — 전부 4지선다)
const SCORE_QUESTION_IDS = [1, 2, 3, 4, 5, 6]

// 생활성향 테스트 답변({ 문항id: 선택지id })을 받아 타입별 점수와 주/보조 유형을 계산하는 순수 함수
export function calculateLifestyleScore(rawAnswers) {
  // 1. 타입별 점수를 0으로 초기화
  const scores = Object.fromEntries(LIFESTYLE_TYPES.map((type) => [type, 0]))

  // 2. 답변의 선택지를 lifestyleScoreMap에서 찾아 주타입 +2점, 보조타입 +1점을 더한다
  //    (7~10번 선택지는 lifestyleScoreMap에 없어 자연스럽게 걸러진다)
  for (const optionId of Object.values(rawAnswers)) {
    const scoreEntry = lifestyleScoreMap[optionId]
    if (!scoreEntry) continue
    scores[scoreEntry.twoPointType] += 2
    scores[scoreEntry.onePointType] += 1
  }

  // 3. 동점 처리용: 1~6번 문항에서 각 타입이 "주타입(2점)"으로 선택된 횟수를 센다
  const twoPointCounts = Object.fromEntries(LIFESTYLE_TYPES.map((type) => [type, 0]))
  for (const questionId of SCORE_QUESTION_IDS) {
    const optionId = rawAnswers[questionId]
    const scoreEntry = optionId && lifestyleScoreMap[optionId]
    if (!scoreEntry) continue
    twoPointCounts[scoreEntry.twoPointType] += 1
  }

  // 4. 총점 → 2점 획득 횟수 → 타입 고정 순서 순으로 비교해 순위를 매긴다
  const rankedTypes = [...LIFESTYLE_TYPES].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a]
    if (twoPointCounts[b] !== twoPointCounts[a]) return twoPointCounts[b] - twoPointCounts[a]
    return LIFESTYLE_TYPES.indexOf(a) - LIFESTYLE_TYPES.indexOf(b)
  })

  return { scores, primary: rankedTypes[0], secondary: rankedTypes[1] }
}
