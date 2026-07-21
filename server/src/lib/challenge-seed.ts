export const CHALLENGE_TOPICS = [
  '오늘의 하늘',
  '오늘의 색깔',
  '오늘 마신 음료',
  '오늘 신은 신발',
  '책상 위 물건 하나',
  '오늘의 그림자',
  '창밖 풍경',
  '오늘 먹은 음식',
  '손이 닿는 곳',
  '오늘의 기분을 닮은 것',
]

export function pickChallengeTopic(dateString: string): string {
  let hash = 0
  for (let i = 0; i < dateString.length; i += 1) {
    hash = (hash * 31 + dateString.charCodeAt(i)) >>> 0
  }

  return CHALLENGE_TOPICS[hash % CHALLENGE_TOPICS.length]
}
