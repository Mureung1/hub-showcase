// 프로필 알레르기(healthProfile.js의 ALLERGY_OPTIONS 키 + 자유 입력 혼합) <-> 급식·학식 메뉴에 이미
// 붙어 있는 M코드(allergyRules.js, M1~M19)를 대조한다(트랙 3 §2). 이 코드베이스에서 가장 명백하게
// 연결이 빠져 있던 두 데이터였다 — 프로필에 알레르기를 입력해도 급식 화면 어디에도 경고가 뜨지 않았다.
import { MILAIZE_ALLERGENS } from './allergyRules.js'
import { ALLERGY_OPTIONS } from './healthProfile.js'

// ALLERGY_OPTIONS(7개, 정의된 옵션)의 키 -> M코드. "갑각류"는 게(M8)·새우(M9)만 가리킨다 —
// 조개류(M18)는 생물학적으로 다른 분류(연체동물)라 포함하지 않는다.
const OPTION_KEY_TO_M_CODES = {
  egg: ['M1'],
  milk: ['M2'],
  peanut: ['M4'],
  shellfish: ['M8', 'M9'],
  buckwheat: ['M3'],
  soy: ['M5'],
  wheat: ['M6'],
}

const OPTION_KEYS = new Set(ALLERGY_OPTIONS.map((o) => o.key))

// 자유 입력 텍스트(예: "고등어") -> M코드. MILAIZE_ALLERGENS의 이름/키워드와 부분 일치하면 매칭한다
// (완전 일치만 요구하면 "새우 알레르기"처럼 조사가 붙은 입력을 놓친다).
function matchFreeTextToMCodes(text) {
  const normalized = String(text || '').trim().toLowerCase()
  if (!normalized) return []

  return MILAIZE_ALLERGENS.filter((allergen) => {
    const name = allergen.name.toLowerCase()
    if (normalized.includes(name)) return true
    return allergen.keywords.some((kw) => normalized.includes(kw.toLowerCase()))
  }).map((allergen) => allergen.code)
}

// profileAllergies(string[]) -> M코드 Set. 정의된 옵션 키는 고정 매핑, 그 외(자유 입력)는 키워드 매칭.
function toMCodes(profileAllergies) {
  const codes = new Set()
  for (const tag of profileAllergies || []) {
    const matched = OPTION_KEYS.has(tag) ? OPTION_KEY_TO_M_CODES[tag] || [] : matchFreeTextToMCodes(tag)
    for (const code of matched) codes.add(code)
  }
  return codes
}

// profileAllergies: profile.allergies. menuAllergyCodes: 그 메뉴 하나에 붙은 M코드 배열(NEIS 공식
// 또는 학식 키워드 추정, 둘 다 이미 M코드 체계로 통일돼 있다 — allergyRules.js 참고).
// 반환: 겹치는 M코드 배열(중복 없음, 순서는 MILAIZE_ALLERGENS 정의 순). 비어 있으면 겹침 없음 —
// 이건 "안전"이 아니라 "지금 아는 한 걸리는 게 없다"는 뜻이라, 호출부는 이 결과로 안전 문구를
// 만들면 안 되고 경고가 있을 때만 화면에 표시해야 한다.
export function findAllergyConflicts(profileAllergies, menuAllergyCodes) {
  if (!Array.isArray(profileAllergies) || profileAllergies.length === 0) return []
  if (!Array.isArray(menuAllergyCodes) || menuAllergyCodes.length === 0) return []

  const myMCodes = toMCodes(profileAllergies)
  if (myMCodes.size === 0) return []

  const menuCodeSet = new Set(menuAllergyCodes)
  return MILAIZE_ALLERGENS.filter((allergen) => myMCodes.has(allergen.code) && menuCodeSet.has(allergen.code)).map(
    (allergen) => allergen.code,
  )
}
