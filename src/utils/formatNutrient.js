/**
 * 영양 수치를 화면에 표시할 때 쓰는 반올림 함수.
 * 숫자가 아닌 값(null/undefined 등)은 0으로 떨어뜨린다.
 *
 * @param {number} value
 * @returns {number} 정수
 */
export function formatNutrient(value) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}
