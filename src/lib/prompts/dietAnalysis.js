// AI 식습관 분석(PRD 4주차 3절, FR-3.2) 프롬프트 — 집계 요약 수치만 근거로 쓰고, 원본 끼니 기록이나
// 개인 식별 정보는 절대 프롬프트에 담지 않는다. 프롬프트 조립을 이 파일 하나로 분리해, 화면 코드
// (DietAnalysisCard.jsx)는 요청을 어떻게 구성하는지 몰라도 되게 한다.
import { NUTRIENT_LABELS } from '../nutrition.js'

const MIN_SENTENCES = 4

function formatAchievementLine(achievementRates) {
  if (!achievementRates) return '권장 섭취량 정보 없음'
  const parts = NUTRIENT_LABELS.map(({ key, label }) => {
    const rate = achievementRates[key]
    return rate == null ? null : `${label} ${rate}%`
  }).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '권장 섭취량 정보 없음'
}

// summary: dietSummary.buildDietSummary()의 반환값(null이 아닌 경우만 호출부가 넘긴다).
// periodDays: 7 | 30 — 사용자가 고른 분석 기간 옵션(FR-3.1).
export function buildDietAnalysisPrompt(summary, periodDays) {
  const { startDate, endDate, recordedDays, avgCalories, achievementRates, topFoods, exceededNutrients, deficientNutrients } = summary

  const topFoodsLine = topFoods.length > 0 ? topFoods.map((f) => `${f.name}(${f.count}회)`).join(', ') : '없음'
  const exceededLine = exceededNutrients.length > 0 ? exceededNutrients.join(', ') : '없음'
  const deficientLine = deficientNutrients.length > 0 ? deficientNutrients.join(', ') : '없음'

  return `당신은 신뢰할 수 있는 영양 코치입니다. 아래는 사용자의 최근 ${periodDays}일(${startDate} ~ ${endDate}, 실제 기록 ${recordedDays}일) 식단 집계 요약입니다. 이 수치만 근거로 삼아 피드백을 작성하세요.

[집계 요약]
- 일평균 칼로리: ${avgCalories}kcal
- 영양소별 권장량 대비 달성률: ${formatAchievementLine(achievementRates)}
- 자주 등장한 음식: ${topFoodsLine}
- 과다 섭취 경향(달성률 130% 초과): ${exceededLine}
- 부족 섭취 경향(달성률 70% 미만): ${deficientLine}

[작성 규칙]
1. 한국어 존댓말로, 최소 ${MIN_SENTENCES}문장 이상 작성하세요.
2. 다음 순서를 반드시 따르세요: ① 잘한 점 1가지 → ② 주의해야 할 패턴 1~2가지 → ③ 구체적인 실천 제안 1~2가지 → ④ 짧은 격려 마무리.
3. 위 [집계 요약]에 없는 날짜별 세부 기록이나 개인 정보는 절대 언급하지 마세요 — 당신은 그 정보를 모릅니다.
4. "~병 위험이 있습니다", "치료가 필요합니다" 같은 질병 진단·치료 표현은 절대 쓰지 마세요. 어디까지나 습관 코칭입니다.
5. 설명, 제목, 마크다운 기호 없이 순수 문단 텍스트만 반환하세요.`
}

// 대략적인 한국어 문장 수 — 마침표/물음표/느낌표로 끝나는 조각 수를 센다. 4문장 미만이면 호출부가
// 1회 자동 재요청하고, 그래도 미달이면 오류로 처리한다(FR-3.2).
export function countSentences(text) {
  if (typeof text !== 'string' || !text.trim()) return 0
  const matches = text.match(/[^.!?]+[.!?]+/g)
  return matches ? matches.filter((s) => s.trim().length > 0).length : 0
}

export function isDietAnalysisValid(text) {
  return countSentences(text) >= MIN_SENTENCES
}

export const DIET_ANALYSIS_MIN_SENTENCES = MIN_SENTENCES
