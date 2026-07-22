/**
 * 시장별 통화 표기 — 국장(KR)/미장(US)의 가격 단위를 구분한다.
 * KR: "1,234원" · US: "$1,234". 유효하지 않은 값은 "-".
 */
export function formatPrice(value, market) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return market === 'US' ? `$${n.toLocaleString('en-US')}` : `${n.toLocaleString('ko-KR')}원`
}
