/**
 * 미터 단위 거리를 사람이 읽기 쉬운 문자열로 변환한다.
 * 1000m 미만 → "320m", 1000m 이상 → "1.2km"(소수점 첫째 자리, .0 제거).
 *
 * @param {number} meters 거리(미터)
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  return `${km.toFixed(1).replace(/\.0$/, '')}km`;
}
