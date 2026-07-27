type ChallengeTopic = {
  topic: string
  category: string
}

export const CHALLENGE_CATEGORIES = ['자연', '감각', '일상', '사물', '감정']

export const CHALLENGE_TOPICS: ChallengeTopic[] = [
  { topic: '오늘의 하늘', category: '자연' },
  { topic: '창밖 풍경', category: '자연' },
  { topic: '오늘의 색깔', category: '감각' },
  { topic: '오늘의 그림자', category: '감각' },
  { topic: '오늘 마신 음료', category: '일상' },
  { topic: '오늘 신은 신발', category: '일상' },
  { topic: '오늘 먹은 음식', category: '일상' },
  { topic: '책상 위 물건 하나', category: '사물' },
  { topic: '손이 닿는 곳', category: '사물' },
  { topic: '오늘의 기분을 닮은 것', category: '감정' },
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  return hash
}

/**
 * 같은 seed(=userId+date)면 항상 같은 결과를 반환한다.
 * preferredCategory가 있으면 80% 확률로 그 카테고리 안에서, 20%는 전체 풀에서 고른다("위주로").
 */
export function pickChallengeTopic(seed: string, preferredCategory?: string | null): string {
  const hash = hashString(seed)

  const pool =
    preferredCategory && hash % 10 < 8
      ? CHALLENGE_TOPICS.filter((item) => item.category === preferredCategory)
      : CHALLENGE_TOPICS

  const list = pool.length > 0 ? pool : CHALLENGE_TOPICS
  return list[hash % list.length]!.topic
}
