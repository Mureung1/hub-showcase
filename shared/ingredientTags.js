export const INGREDIENT_TAGS = [
  "nutrition:carb",
  "nutrition:protein",
  "nutrition:vegetable",
  "nutrition:fat",
  "processing:processed",
  "processing:instant",
];

export const INGREDIENT_TAG_LABELS = {
  "nutrition:carb": "탄수화물",
  "nutrition:protein": "단백질",
  "nutrition:vegetable": "채소",
  "nutrition:fat": "지방",
  "processing:processed": "가공식품",
  "processing:instant": "인스턴트",
};

const CATEGORY_DEFAULT_TAGS = {
  egg: ["nutrition:protein"],
  meat: ["nutrition:protein"],
  seafood: ["nutrition:protein"],
  vegetable: ["nutrition:vegetable"],
  dairy: ["nutrition:protein", "nutrition:fat"],
  tofu: ["nutrition:protein"],
  grain: ["nutrition:carb"],
  noodle: ["nutrition:carb"],
  bread: ["nutrition:carb"],
  frozenFood: ["processing:processed"],
  canned: ["processing:processed"],
  prepared: ["processing:processed"],
  instant: ["nutrition:carb", "processing:instant"],
  sauce: ["processing:processed"],
  oil: ["nutrition:fat"],
};

const INGREDIENT_NAME_TAGS = {
  "계란": ["nutrition:protein"],
  "목살": ["nutrition:protein"],
  "소고기 국거리": ["nutrition:protein"],
  "고등어": ["nutrition:protein"],
  "두부": ["nutrition:protein"],
  "냉동 새우": ["nutrition:protein"],
  "참치 통조림": ["nutrition:protein", "processing:processed"],
  "햄 통조림": ["nutrition:protein", "processing:processed"],
  "제육볶음": ["nutrition:protein", "processing:processed"],
  "냉동만두": ["nutrition:carb", "nutrition:protein", "processing:processed"],
  "슬라이스 치즈": ["nutrition:protein", "nutrition:fat"],
  "리코타 치즈": ["nutrition:protein", "nutrition:fat"],
  "버터": ["nutrition:fat"],
  "올리브유": ["nutrition:fat"],
  "밥": ["nutrition:carb"],
  "사워도우": ["nutrition:carb"],
  "파스타면": ["nutrition:carb"],
  "소면": ["nutrition:carb"],
  "라면": ["nutrition:carb", "processing:instant"],
  "양파": ["nutrition:vegetable"],
  "대파": ["nutrition:vegetable"],
  "부추": ["nutrition:vegetable"],
  "당근": ["nutrition:vegetable"],
  "다진마늘": ["nutrition:vegetable"],
  "샐러드 채소": ["nutrition:vegetable"],
  "방울토마토": ["nutrition:vegetable"],
  "아스파라거스": ["nutrition:vegetable"],
};

const allowedTagSet = new Set(INGREDIENT_TAGS);

export function getDefaultIngredientTags(category) {
  return [...(CATEGORY_DEFAULT_TAGS[category] ?? [])];
}

export function sanitizeIngredientTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter((tag) => allowedTagSet.has(tag)))];
}

export function getIngredientTags(ingredient) {
  if (!ingredient) return [];
  if (Array.isArray(ingredient.tags)) return sanitizeIngredientTags(ingredient.tags);
  return getDefaultIngredientTags(ingredient.category);
}

export function getTagsForIngredientName(name, ingredients = []) {
  const normalizedName = name?.trim();
  const ownedIngredient = ingredients.find((ingredient) => ingredient.name?.trim() === normalizedName);
  if (ownedIngredient) return getIngredientTags(ownedIngredient);
  return [...(INGREDIENT_NAME_TAGS[normalizedName] ?? [])];
}
