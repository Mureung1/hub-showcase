// MealCard.jsx의 번호 위첨자·범례 표기를 위한 순수 함수(4주차 보강 Step 6). 컴포넌트에서 분리해두면
// "메뉴명 옆 번호 ↔ 범례 번호가 정확히 대응한다"는 핵심 요구사항을 브라우저 없이 테스트할 수 있다.
export function codeNumber(code) {
  return Number(code.slice(1))
}

// 중복 제거 + 오름차순 — 위첨자 표기와 범례가 항상 같은 순서로 대응하게 한다.
export function sortAllergyCodes(codes) {
  return [...new Set(codes || [])].sort((a, b) => codeNumber(a) - codeNumber(b))
}

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']

export function toSuperscript(n) {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPT_DIGITS[Number(d)])
    .join('')
}
