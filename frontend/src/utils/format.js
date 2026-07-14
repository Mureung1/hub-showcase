// API 응답 값 → 화면 표기 변환 (라벨·클래스 매핑, 숫자 포맷)

export const SKILL_LEVEL_LABELS = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

// 난이도 → 한글 라벨 + badge 색 (AppFlow.css의 badge-* 클래스)
export const DIFFICULTY_META = {
  easy: { label: '쉬움', tone: 'blue' },
  medium: { label: '보통', tone: 'amber' },
  hard: { label: '어려움', tone: 'amber' },
}

// 언어 → 색 견본 클래스 (AppFlow.css의 lang-* 클래스, 없는 언어는 기본색)
export const LANGUAGE_CLASSES = {
  JavaScript: 'lang-js',
  TypeScript: 'lang-ts',
}

// 라벨 → 강조 클래스 (없는 라벨은 기본 tag)
export const TAG_CLASSES = {
  'good first issue': 'tag-gfi',
  bug: 'tag-bug',
  documentation: 'tag-doc',
  enhancement: 'tag-enh',
}

// 스타 수를 '64.2k' 형태로 축약
export function formatStars(count) {
  if (count < 1000) return String(count)
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
}
