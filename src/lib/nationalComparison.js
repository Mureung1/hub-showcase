// "오늘 내 섭취 vs 한국 평균" 비교 순수 로직. NationalComparisonCard 전용.
// 평균 근처(±NEAR_RATIO)는 '비슷', 그 아래는 '부족', 위는 '과다'로 본다. 단, 나트륨은 상한형이라
// 방향이 반대다 — 평균보다 "적게" 먹는 게 좋은 것이므로, 평균 이하면 긍정('good')으로 평가한다.
import { NUTRIENT_LABELS } from './nutrition.js'

const NEAR_RATIO = 0.15 // ±15% 이내면 "평균과 비슷"

// 마지막 음절 받침 유무로 주격조사 이/가를 고른다(유니코드 한글 syllable 공식).
function subjectParticle(word) {
  if (!word) return '가'
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return '가'
  return code % 28 !== 0 ? '이' : '가'
}

// status: 'near'(평균 비슷) | 'low'(부족) | 'high'(과다) | 'good'(나트륨이 평균보다 적음=좋음)
function nutrientStatus(key, ratio) {
  if (key === 'sodium') {
    if (ratio <= 1) return 'good'
    if (ratio <= 1 + NEAR_RATIO) return 'near'
    return 'high'
  }
  if (ratio < 1 - NEAR_RATIO) return 'low'
  if (ratio > 1 + NEAR_RATIO) return 'high'
  return 'near'
}

// 각 영양소별 비교 행. fillPercent: 트랙이 [0, 2×평균]을 나타내고 평균은 50% 지점 — 그 안에서 내 값의
// 위치(%)를 0~100으로 나타낸다(내 값이 평균의 2배 이상이면 100에서 잘림). 평균 마커는 항상 50%에 둔다.
export function buildNationalComparisonRows(myTotal, average) {
  return NUTRIENT_LABELS.map(({ key, label, unit }) => {
    const mine = Math.max(0, Number(myTotal?.[key]) || 0)
    const avg = Number(average?.[key]) || 0
    const ratio = avg > 0 ? mine / avg : 0
    const diffPercent = avg > 0 ? Math.round((ratio - 1) * 100) : 0
    return {
      key,
      label,
      unit,
      mine: Math.round(mine),
      avg: Math.round(avg),
      ratio,
      diffPercent,
      status: nutrientStatus(key, ratio),
      fillPercent: Math.min(100, Math.round((ratio / 2) * 100)),
    }
  })
}

// "평균보다 12% 많아요 / 적어요 / 비슷해요" 문구. 나트륨도 방향만 다르지 표현은 동일하게.
export function describeDiff(diffPercent) {
  if (Math.abs(diffPercent) <= NEAR_RATIO * 100) return '평균과 비슷해요'
  return diffPercent > 0 ? `평균보다 ${diffPercent}% 많아요` : `평균보다 ${Math.abs(diffPercent)}% 적어요`
}

// 6개 비교 행으로 한 줄 종합 평가를 만든다. 나트륨 과다를 최우선 경고하고, 그다음 균형/부족을 본다.
export function summarizeComparison(rows) {
  if (rows.length === 0) return ''

  const sodium = rows.find((r) => r.key === 'sodium')
  if (sodium && sodium.status === 'high') {
    return '나트륨을 평균보다 많이 드셨어요. 다음 끼니엔 조금 줄여보세요.'
  }

  const nearCount = rows.filter((r) => r.status === 'near' || r.status === 'good').length
  if (nearCount >= 4) {
    return '전반적으로 한국 평균과 비슷한, 균형 잡힌 식단이에요.'
  }

  // 부족한 목표형 영양소(나트륨 제외) 중 가장 부족한 것을 콕 집어준다.
  const lowest = rows
    .filter((r) => r.key !== 'sodium' && r.status === 'low')
    .sort((a, b) => a.ratio - b.ratio)[0]
  if (lowest) {
    return `${lowest.label}${subjectParticle(lowest.label)} 평균보다 부족한 편이에요.`
  }

  return '오늘 섭취를 한국 평균과 비교해봤어요.'
}
