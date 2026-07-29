const LIQUID_INGREDIENT_NAMES = new Set([
  "물",
  "우유",
  "두유",
  "생크림",
  "육수",
  "채수",
  "멸치육수",
  "사골육수",
  "간장",
  "식초",
  "액젓",
  "맛술",
  "식용유",
  "참기름",
  "들기름",
  "올리고당",
  "꿀",
  "주스",
  "음료",
]);

const LIQUID_UNIT_NAMES = new Set([
  "ml",
  "l",
  "밀리리터",
  "리터",
  "큰술",
  "작은술",
  "컵",
]);

function normalize(value) {
  return String(value ?? "").trim().replaceAll(" ", "").toLowerCase();
}

export function isLiquidIngredient({ name, unit } = {}) {
  const normalizedName = normalize(name);
  const normalizedUnit = normalize(unit);
  return LIQUID_UNIT_NAMES.has(normalizedUnit)
    || LIQUID_INGREDIENT_NAMES.has(normalizedName)
    || /(?:소스|드레싱|시럽|기름|오일|육수|국물|주스|음료)$/.test(normalizedName);
}
