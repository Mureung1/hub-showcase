/**
 * bizinfo·K-Startup처럼 여러 사이트가 같은 정부 프로그램을 재게시하는 경우를 걸러내기 위한
 * 제목 유사도 판정(이슈 #94). 공식 공고번호 체계가 사이트마다 달라 식별자로는 중복을 못 잡아서
 * 제목을 문자 bigram Jaccard 유사도로 비교한다. 정확한 임계값은 아직 실제 중복 사례로 검증된
 * 게 아니라 보수적으로(오탐 방지 우선) 잡은 값 — 운영 데이터로 지켜보며 조정 필요.
 */
const NORMALIZE_PATTERN = /[\s()[\]{}·ㆍ,.\-~!?"'“”‘’]/g

function normalizeTitle(name: string): string {
  return name.replace(NORMALIZE_PATTERN, '')
}

function bigrams(text: string): Set<string> {
  const result = new Set<string>()
  for (let i = 0; i < text.length - 1; i++) {
    result.add(text.slice(i, i + 2))
  }
  return result
}

/** 두 제목의 문자 bigram Jaccard 유사도(0~1). 정규화 후 둘 중 하나라도 빈 문자열이면 0 */
export function titleSimilarity(a: string, b: string): number {
  const bigramsA = bigrams(normalizeTitle(a))
  const bigramsB = bigrams(normalizeTitle(b))
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0

  let intersection = 0
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection++
  }
  const union = bigramsA.size + bigramsB.size - intersection
  return intersection / union
}

/** 이 값 이상이면 같은 공고의 재게시로 간주한다 — 오탐 방지를 우선한 보수적 값 */
export const DUPLICATE_TITLE_THRESHOLD = 0.75

/** candidate 제목이 existingNames 중 하나와 임계값 이상 유사하면 true(중복으로 간주) */
export function isDuplicateTitle(candidate: string, existingNames: string[]): boolean {
  return existingNames.some((name) => titleSimilarity(candidate, name) >= DUPLICATE_TITLE_THRESHOLD)
}
