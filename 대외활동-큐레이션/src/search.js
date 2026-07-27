// 텍스트 검색. 기존엔 제목만 단일 문자열로 찾아 "부산 서포터즈" 같은 여러 단어 조합이나
// 기관명 검색이 안 됐다. 이제 제목·기관·참가대상을 함께 보고, 공백으로 나눈 여러 키워드를 모두
// 포함(AND)해야 매치한다. 대소문자·앞뒤 공백은 무시한다.
export function matchesQuery(posting, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true; // 빈 검색어는 전부 통과
  const hay = `${posting.title || ""} ${posting.org || ""} ${posting.eligibilityText || ""}`.toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}
