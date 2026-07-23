const REQUIRED_QUERY_MESSAGE = "검색어를 입력해주세요.";
const MIN_LENGTH_QUERY_MESSAGE = "검색어는 2글자 이상 입력해주세요.";

export function validateSearchQuery(rawQuery) {
  if (typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
    return { errorMessage: REQUIRED_QUERY_MESSAGE };
  }

  const query = rawQuery.trim();

  if (query.length < 2) {
    return { errorMessage: MIN_LENGTH_QUERY_MESSAGE };
  }

  return { query };
}
