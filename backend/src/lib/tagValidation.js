// Claude(Gemini) 태깅 응답이 저장 가능한 형태인지 확인하는 순수 검증 함수.
// 저장 전에 항상 이걸 거치되, 검증 결과와 무관하게 원본은 taggingRaw에 그대로 남긴다.
import { isValidEmotion } from '../config/emotions.js'

export function validateTagResponse(response) {
  const errors = []

  if (!response || typeof response !== 'object') {
    return { valid: false, errors: ['응답이 객체가 아님'] }
  }

  const { primary_emotion, secondary_emotions, keywords, summary, risk_flag } = response

  if (!isValidEmotion(primary_emotion)) {
    errors.push('primary_emotion이 허용된 감정 어휘가 아님')
  }

  if (!Array.isArray(secondary_emotions) || secondary_emotions.length !== 2) {
    errors.push('secondary_emotions는 2개여야 함')
  } else {
    if (!secondary_emotions.every(isValidEmotion)) {
      errors.push('secondary_emotions에 허용되지 않은 감정 어휘가 있음')
    }
    if (secondary_emotions.includes(primary_emotion)) {
      errors.push('secondary_emotions가 primary_emotion과 중복됨')
    }
    if (secondary_emotions[0] === secondary_emotions[1]) {
      errors.push('secondary_emotions 두 값이 서로 중복됨')
    }
  }

  if (
    !Array.isArray(keywords) ||
    keywords.length !== 3 ||
    keywords.some((k) => typeof k !== 'string' || k.trim() === '')
  ) {
    errors.push('keywords는 비어있지 않은 문자열 3개여야 함')
  }

  if (typeof summary !== 'string' || summary.trim() === '' || summary.length > 120) {
    errors.push('summary는 1~120자여야 함')
  }

  if (typeof risk_flag !== 'boolean') {
    errors.push('risk_flag는 boolean이어야 함')
  }

  return { valid: errors.length === 0, errors }
}

// emotionAdjacencyPrompt 응답 검증. 구조가 틀리거나 목록에 없는 단어를 answer로 줘도
// (그런 단어는 걸러내고) 실패로 보지 않는다 — 최악의 경우 빈 인접 관계로 감정을 고립 상태로
// 추가하고 태깅은 계속 진행하게 하기 위해서다.
export function validateEmotionAdjacencyResponse(response, existingEmotions) {
  const adjacentTo = Array.isArray(response?.adjacent_to) ? response.adjacent_to : []
  const cleaned = [...new Set(adjacentTo)].filter((emotion) => existingEmotions.includes(emotion))
  return cleaned.slice(0, 2)
}
