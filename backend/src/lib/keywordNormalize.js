// 편지 키워드(keywords_raw)를 매칭용 대표어(keywords_norm)로 정규화한다.
// 1) 동의어 사전(synonyms.json)에 있으면 대표어로 치환
// 2) 없으면 공백 제거·소문자화·기본 조사 제거만 적용하고 원문을 그대로 쓴다
import { SYNONYMS } from '../config/matchingConfig.js'

function buildReverseLookup(synonyms) {
  const map = new Map()
  for (const [representative, variants] of Object.entries(synonyms)) {
    map.set(representative, representative)
    for (const variant of variants) {
      map.set(variant, representative)
    }
  }
  return map
}

const REVERSE_LOOKUP = buildReverseLookup(SYNONYMS)

// 긴 조사부터 검사해야 "에서"가 "에"로 잘못 잘리는 걸 막을 수 있다.
const TRAILING_PARTICLES = ['에게', '에서', '은', '는', '이', '가', '을', '를', '의', '에', '와', '과', '도']
  .sort((a, b) => b.length - a.length)

function stripTrailingParticle(text) {
  for (const particle of TRAILING_PARTICLES) {
    if (text.length > particle.length && text.endsWith(particle)) {
      return text.slice(0, -particle.length)
    }
  }
  return text
}

function basicNormalize(raw) {
  const noWhitespace = raw.replace(/\s+/g, '').toLowerCase()
  return stripTrailingParticle(noWhitespace)
}

export function normalizeKeyword(raw) {
  const trimmed = raw.trim()
  if (REVERSE_LOOKUP.has(trimmed)) {
    return REVERSE_LOOKUP.get(trimmed)
  }
  return basicNormalize(trimmed)
}

export function normalizeKeywords(rawKeywords) {
  return rawKeywords.map(normalizeKeyword)
}
