// 냉장고 화면 검색창에서 쓰는 재료 검색 매칭 로직.
// label(대표 표기)·matchNames(동의어)·group(상위 재료명, 예: 두부/순두부 → "두부")을 모두 훑어서
// 부분일치(대소문자·앞뒤 공백 무시)하는 칩을 후보로 반환한다.
export function searchIngredients(query, options) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  return options.filter((option) => {
    const haystacks = [option.label, option.group, ...option.matchNames]
    return haystacks.some((text) => text?.toLowerCase().includes(normalized))
  })
}
