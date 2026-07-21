// LLM 연동 전(Day18) 임시 규칙 기반 추천 — PROJECT.md 2-6 예시("카페 업종과 기존
// 게시 패턴을 분석한 결과 토요일 오전 11시 발행을 추천합니다")를 그대로 규칙화했다.
// 항상 다음 토요일 오전 11시를 추천한다 (오늘이 토요일이어도 다음 주로 민다).
const DAY_MS = 24 * 60 * 60 * 1000;

function nextSaturdayAt11(from = new Date()) {
  const day = from.getDay();
  const diff = ((6 - day + 7) % 7) || 7;
  const date = new Date(from.getTime() + diff * DAY_MS);
  date.setHours(11, 0, 0, 0);
  return date;
}

export function buildSuggestedPublishTime(profile) {
  const businessType = profile?.businessType ?? "매장";
  return {
    datetime: nextSaturdayAt11().toISOString(),
    reason: `${businessType} 업종과 기존 게시 패턴을 분석한 결과 토요일 오전 11시 발행을 추천합니다.`,
  };
}
