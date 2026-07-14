// 선호 조건 기본값 — 프로필 화면 칩 표시와 추천 요청(mock)에 공용으로 사용

export const LANGUAGE_OPTIONS = ['JavaScript', 'Python', 'TypeScript', 'Go', 'Java']

// 관심 주제 칩: 화면 라벨(한글) ↔ API 값(영문 슬러그)
export const TOPIC_OPTIONS = [
  { label: '웹 / 프론트', value: 'frontend' },
  { label: '백엔드', value: 'backend' },
  { label: '모바일', value: 'mobile' },
  { label: 'AI / ML', value: 'ai-ml' },
  { label: '데이터', value: 'data' },
  { label: 'DevOps / 인프라', value: 'devops' },
  { label: '개발도구', value: 'cli' },
]

// 첫 기여 서비스이므로 초·중급은 easy부터 권한다
const SKILL_TO_DIFFICULTY = {
  beginner: 'easy',
  intermediate: 'easy',
  advanced: 'medium',
}

// 분석 결과 → 기본 선호 조건 (활동 없는 사용자는 첫 언어 옵션 + easy)
export function buildDefaultPreferences(analysis) {
  const topLanguage = analysis.languages[0]?.name ?? LANGUAGE_OPTIONS[0]
  return {
    languages: [topLanguage],
    difficulty: SKILL_TO_DIFFICULTY[analysis.skillLevel] ?? 'easy',
    topics: [],
  }
}
