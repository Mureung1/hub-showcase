const STORED_AT = "2026-07-15";

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function createMockIngredient(values) {
  const isLongTerm = values.expirationType === "longTerm";
  const recommendedUseBy = values.storage === "freezer" && values.shelfLifeDays
    ? addDays(STORED_AT, values.shelfLifeDays)
    : null;

  return {
    id: values.id,
    name: values.name,
    category: values.category,
    subcategory: values.subcategory ?? null,
    tags: values.tags ?? [],
    quantity: values.quantity ?? null,
    unit: values.unit ?? null,
    quantityMode: values.quantityMode ?? "exact",
    storage: values.storage,
    expirationType: values.expirationType ?? "relative",
    expirationDate: values.expirationDate ?? null,
    shelfLifeDays: values.shelfLifeDays ?? null,
    storedAt: values.storedAt ?? STORED_AT,
    recommendedUseBy,
    nextCheckDate: isLongTerm ? addDays(STORED_AT, 180) : null,
    isStaple: values.isStaple ?? false,
    isInstant: values.isInstant ?? false,
    isPrepared: values.isPrepared ?? false,
    isLongTerm,
    icon: values.icon,
    memo: values.memo ?? "",
  };
}

export const mockIngredients = [
  createMockIngredient({ id: "ingredient-egg", name: "계란", category: "egg", quantity: 10, unit: "개", storage: "fridge", shelfLifeDays: 21, icon: "🥚" }),
  createMockIngredient({ id: "ingredient-pork-neck", name: "목살", category: "meat", subcategory: "pork", quantity: 300, unit: "g", storage: "freezer", shelfLifeDays: 90, icon: "🥩" }),
  createMockIngredient({ id: "ingredient-spicy-pork", name: "제육볶음", category: "prepared", tags: ["meat", "korean"], quantity: 2, unit: "인분", storage: "fridge", shelfLifeDays: 7, isPrepared: true, icon: "🍱" }),
  createMockIngredient({ id: "ingredient-sliced-cheese", name: "슬라이스 치즈", category: "dairy", quantity: 8, unit: "장", storage: "fridge", shelfLifeDays: 14, icon: "🧀" }),
  createMockIngredient({ id: "ingredient-chives", name: "부추", category: "vegetable", quantity: 1, unit: "단", storage: "fridge", shelfLifeDays: 7, icon: "🌿" }),
  createMockIngredient({ id: "ingredient-onion", name: "양파", category: "vegetable", quantity: 3, unit: "개", storage: "room", shelfLifeDays: 14, icon: "🧅" }),
  createMockIngredient({ id: "ingredient-green-onion", name: "대파", category: "vegetable", quantity: 1, unit: "단", storage: "fridge", shelfLifeDays: 7, icon: "🌱" }),
  createMockIngredient({ id: "ingredient-carrot", name: "당근", category: "vegetable", quantity: 2, unit: "개", storage: "fridge", shelfLifeDays: 14, icon: "🥕" }),
  createMockIngredient({ id: "ingredient-beef-soup", name: "소고기 국거리", category: "meat", subcategory: "beef", quantity: 500, unit: "g", storage: "freezer", shelfLifeDays: 90, icon: "🥩" }),
  createMockIngredient({ id: "ingredient-mackerel", name: "고등어", category: "seafood", quantity: 2, unit: "토막", storage: "fridge", shelfLifeDays: 2, icon: "🐟" }),
  createMockIngredient({ id: "ingredient-butter", name: "버터", category: "dairy", quantity: 200, unit: "g", storage: "fridge", shelfLifeDays: 14, icon: "🧈" }),
  createMockIngredient({ id: "ingredient-tofu", name: "두부", category: "tofu", quantity: 1, unit: "모", storage: "fridge", shelfLifeDays: 7, icon: "◻️" }),
  createMockIngredient({ id: "ingredient-frozen-dumplings", name: "냉동만두", category: "frozenFood", tags: ["prepared"], quantity: 1, unit: "봉지", storage: "freezer", shelfLifeDays: 180, isPrepared: true, icon: "🥟" }),
  createMockIngredient({ id: "ingredient-sourdough", name: "사워도우", category: "bread", quantity: 1, unit: "개", storage: "freezer", shelfLifeDays: 90, icon: "🍞" }),
  createMockIngredient({ id: "ingredient-minced-garlic", name: "다진마늘", category: "seasoning", tags: ["vegetable"], quantity: 1, unit: "통", quantityMode: "rough", storage: "fridge", shelfLifeDays: 30, icon: "🧄" }),
  createMockIngredient({ id: "ingredient-pasta", name: "파스타면", category: "noodle", quantity: 2, unit: "인분", storage: "room", expirationType: "longTerm", isStaple: true, icon: "🍝" }),
  createMockIngredient({ id: "ingredient-tuna-can", name: "참치 통조림", category: "canned", quantity: 2, unit: "캔", storage: "room", expirationType: "longTerm", icon: "🥫" }),
  createMockIngredient({ id: "ingredient-tomato-sauce", name: "토마토 소스", category: "sauce", quantity: 1, unit: "병", storage: "room", expirationType: "longTerm", icon: "🍅" }),
  createMockIngredient({ id: "ingredient-ham-can", name: "햄 통조림", category: "canned", tags: ["processed"], quantity: 2, unit: "캔", storage: "room", expirationType: "longTerm", icon: "🥫" }),
  createMockIngredient({ id: "ingredient-ramen", name: "라면", category: "instant", quantity: 3, unit: "개", storage: "room", shelfLifeDays: 180, isInstant: true, isStaple: true, icon: "🍜" }),
  createMockIngredient({ id: "ingredient-somyeon", name: "소면", category: "noodle", quantity: 3, unit: "인분", storage: "room", expirationType: "longTerm", isStaple: true, icon: "🍜" }),
  createMockIngredient({ id: "ingredient-seasonings", name: "각종 소스 및 조미료", category: "seasoning", quantityMode: "notTracked", storage: "room", expirationType: "longTerm", icon: "🧂" }),
  createMockIngredient({ id: "ingredient-dashida", name: "다시다", category: "seasoning", quantityMode: "notTracked", storage: "room", expirationType: "longTerm", icon: "🧂" }),
];

