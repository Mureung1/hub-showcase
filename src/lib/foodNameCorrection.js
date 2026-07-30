// 사용자가 1탭으로 "조리법"을 고쳐 DB를 다시 조회하게 하는 순수 로직.
//
// 왜 필요한가: 이 앱의 정확도는 AI가 정한 dbSearchName 하나에 걸려 있다. 그 이름이 틀리면 뒤의
// 매칭·중량·보정이 아무리 정확해도 전부 엉뚱한 음식의 수치가 된다. 그리고 실제로 가장 자주 틀리는
// 축이 **조리법**이다 — 같은 재료라도 구이/찜/조림/튀김은 식약처 DB에 서로 다른 레코드로 있고
// (실측: 고등어구이 vs 고등어조림), 사진만으로는 양념 색과 국물 유무로 구분해야 해서 헷갈린다.
// 재료(돼지/소/닭)는 AI가 거의 틀리지 않는 반면 조리법은 자주 틀려서, 보정 축을 이 하나로 좁혔다.
//
// 이름 조작만 하는 순수 모듈이다 — 조회도 화면도 모른다.

// 라벨은 화면에 그대로 나가고, suffix는 이름 끝에 붙는 실제 표기다.
// foodMatch.js의 COOKING_METHOD_SUFFIXES와 겹치지만 목적이 다르다: 저쪽은 "이 접미사만 다르면 같은
// 음식으로 쳐준다"는 매칭 완화 규칙이고, 여기는 "사용자에게 고르게 할 선택지"다. 그래서 저쪽에 있는
// 절임·무침 같은 건 빼고(사진에서 헷갈릴 일이 거의 없다) 국을 넣었다(찌개/국물류와 자주 헷갈린다).
// ⚠️ '국'과 '탕'은 하나로 묶지 않는다(예전엔 { key:'국', label:'국·탕' } 한 항목이었다). 식약처 DB는
// 둘을 별개 접미사로 등록해두고(STRIPPABLE_SUFFIXES도 마찬가지), applyCookingMethod는 재료 뒤에
// key를 그대로 붙이는 방식이라 '국'만으로는 '탕'을 만들 방법이 없었다. 그 결과 '삼계탕'·'갈비탕'처럼
// 흔한 '탕' 요리는 칩이 활성 표시조차 안 됐고(current==='탕'이 어떤 key와도 안 맞음), 눌러도
// "삼계국" 같은 존재하지 않는 검색어로 재조회됐다(리뷰에서 발견). 두 선택지로 분리하면 활성 판정도
// (key===detectCookingMethod(name)) 정확해지고, 사용자가 국인지 탕인지 직접 고를 수 있다.
export const COOKING_METHODS = [
  { key: '구이', label: '구이' },
  { key: '찜', label: '찜' },
  { key: '조림', label: '조림' },
  { key: '볶음', label: '볶음' },
  { key: '튀김', label: '튀김' },
  { key: '국', label: '국' },
  { key: '탕', label: '탕' },
]

// 이름 끝에서 조리법을 떼어낼 때 쓰는 목록 — 화면 선택지보다 넓다(찌개·탕처럼 사용자가 직접 고르진
// 않지만 원래 이름에는 붙어 있을 수 있는 것들). 긴 것부터 봐야 '갈비탕'의 '탕'이 먼저 걸린다.
const STRIPPABLE_SUFFIXES = ['구이', '조림', '볶음', '튀김', '찌개', '전골', '무침', '절임', '강정', '찜', '국', '탕']

// 조리법을 떼면 음식 이름이 남지 않는 경우(예: "구이" 자체)에는 보정을 제공하지 않는다.
const MIN_BASE_LENGTH = 2

function trimmed(name) {
  return typeof name === 'string' ? name.trim() : ''
}

// 이름 끝에 붙은 조리법. 없으면 null.
export function detectCookingMethod(foodName) {
  const name = trimmed(foodName)
  const hit = STRIPPABLE_SUFFIXES.find((suffix) => name.endsWith(suffix) && name.length - suffix.length >= MIN_BASE_LENGTH)
  return hit ?? null
}

// 조리법을 떼어낸 재료 부분. 조리법이 없으면 이름 그대로.
export function stripCookingMethod(foodName) {
  const name = trimmed(foodName)
  const method = detectCookingMethod(name)
  return method ? name.slice(0, name.length - method.length) : name
}

// 재료는 그대로 두고 조리법만 바꾼 새 검색명. 같은 조리법을 다시 고르면 null을 반환한다
// (호출부가 "바뀐 게 없으니 재조회하지 않는다"로 처리한다).
export function applyCookingMethod(foodName, method) {
  const name = trimmed(foodName)
  if (!name || !COOKING_METHODS.some((m) => m.key === method)) return null
  const base = stripCookingMethod(name)
  if (base.length < MIN_BASE_LENGTH) return null
  const next = `${base}${method}`
  return next === name ? null : next
}

// 이 음식에 조리법 보정을 제공할 수 있는가 — 재료 부분이 남아야 의미가 있다.
export function canCorrectCookingMethod(foodName) {
  return stripCookingMethod(foodName).length >= MIN_BASE_LENGTH
}

// displayName이 "음식명 (브랜드명)" 형식이면 괄호 안 브랜드를 뽑아낸다.
function extractBrand(displayName) {
  const match = /\(([^)]+)\)\s*$/.exec(displayName || '')
  return match ? match[1] : null
}

// AI 식별 항목 하나를 "조리법만 바꾼" 새 항목으로 만든다. 바뀐 게 없으면 null.
//
// ⚠️ 이 함수가 따로 있는 이유: 이름 필드가 **네 개**(nameCandidates·dbSearchName·fallbackSearchName·
// displayName)인데 전부 함께 움직여야 한다. 실제로 같은 종류의 드리프트가 두 번 연달아 났다 —
// 처음엔 displayName만 안 바뀌어 "수치는 조림인데 이름은 구이"였고, 그걸 고치자 이번엔
// nameCandidates가 남아 **정반대로** "이름은 조림인데 수치는 구이"가 됐다(서버 해석 엔진은 검색어를
// [...nameCandidates, dbSearchName, fallbackSearchName] 순으로 보고 앞쪽이 걸리면 즉시 확정하는데,
// AI는 항상 nameCandidates[0] === dbSearchName으로 내기 때문이다).
//
// 검색어 후보를 새 이름 하나로 좁히는 건 의도적이다 — 사용자가 "이건 조림이다"라고 명시적으로
// 알려준 것이라, 못 찾으면 AI 추정으로 떨어지는 편이 사용자가 아니라고 한 음식의 수치를 쓰는
// 것보다 낫다.
export function buildCorrectedIdItem(idItem, method) {
  const searchName = idItem?.dbSearchName
  const nextName = applyCookingMethod(searchName, method)
  if (!nextName) return null

  // 브랜드가 붙은 표시명("고등어구이 (한솥)")은 브랜드를 뗀 음식명 부분에만 조리법을 갈아끼우고
  // 다시 붙인다 — 안 그러면 "고등어구이 (한솥)구이"처럼 조리법이 브랜드 뒤에 붙는다.
  const prevDisplayName = idItem?.displayName
  const brand = extractBrand(prevDisplayName)
  const baseDisplayName = brand ? prevDisplayName.replace(/\s*\([^)]+\)\s*$/, '') : prevDisplayName
  const correctedBase =
    baseDisplayName && canCorrectCookingMethod(baseDisplayName)
      ? (applyCookingMethod(baseDisplayName, method) ?? baseDisplayName)
      : baseDisplayName
  const nextDisplayName = prevDisplayName ? (brand ? `${correctedBase} (${brand})` : correctedBase) : prevDisplayName

  return {
    ...idItem,
    nameCandidates: [nextName],
    dbSearchName: nextName,
    fallbackSearchName: nextName,
    displayName: nextDisplayName,
  }
}
