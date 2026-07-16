import { lifestyleFilterMap } from '../data/lifestyleFilterMap.js'

// 필터 반영 문항 번호 (lifestyleQuestions.js의 group: 'soft' | 'hard', 7~10번)
const FILTER_QUESTION_IDS = [7, 8, 9, 10]

// 생활성향 테스트 답변({ 문항id: 선택지id })을 받아 필터 값을 추출하는 순수 함수
export function extractLifestyleFilters(rawAnswers) {
  const filters = {}

  // 7~10번 문항의 답변을 lifestyleFilterMap에서 찾아 filterName별 value를 채운다
  for (const questionId of FILTER_QUESTION_IDS) {
    const optionId = rawAnswers[questionId]
    const filterEntry = optionId && lifestyleFilterMap[optionId]
    if (!filterEntry) continue
    filters[filterEntry.filterName] = filterEntry.value
  }

  return {
    guestPolicy: filters.guestPolicy,
    temperaturePreference: filters.temperaturePreference,
    smokingStatus: filters.smokingStatus,
    drinkingStatus: filters.drinkingStatus,
  }
}
