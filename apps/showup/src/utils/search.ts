// 검색 키워드에서 phoneLast4 후보를 추출하는 순수 함수
// TDD: 테스트 먼저 작성 (red), 구현 (green)

/**
 * 검색어가 전화번호 뒤 4자리 검색에 해당하는지 판별하고, phoneLast4 값을 반환한다.
 * - 숫자 4자리 → 그대로 반환
 * - 숫자가 아닌 입력 → null (이름 검색으로 처리)
 * - 4자리 초과 숫자 → 마지막 4자리
 * - 4자리 미만 숫자 → null (phoneLast4는 4자리 고정)
 */
export function extractSearchPhoneLast4(keyword: string): string | null {
  const trimmed = keyword.trim();
  if (!trimmed) return null;

  // 숫자만 추출
  const digits = trimmed.replace(/[^0-9]/g, '');

  if (digits.length < 4) return null;
  return digits.slice(-4);
}

/**
 * 검색어가 이름 검색에 해당하는지 판별한다.
 * - 숫자 4자리 이상 → 전화번호 검색 (false)
 * - 숫자 4자리 미만 + 비숫자 포함 → 이름 검색 (true)
 * - 비숫자만 → 이름 검색 (true)
 */
export function isNameSearch(keyword: string): boolean {
  const trimmed = keyword.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/[^0-9]/g, '');
  // 숫자 4자리 이상이면 전화번호 검색 (하이픈 포함 전화번호도 숫자 11자리)
  if (digits.length >= 4) return false;
  // 숫자 4자리 미만이면 이름 검색
  return true;
}