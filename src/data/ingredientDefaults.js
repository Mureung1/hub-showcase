export const INGREDIENT_CATEGORIES = {
  egg: "계란",
  meat: "육류",
  seafood: "수산물",
  vegetable: "채소",
  dairy: "유제품",
  tofu: "두부·콩류",
  grain: "밥·곡류",
  noodle: "면류",
  bread: "빵",
  frozenFood: "냉동식품",
  canned: "통조림",
  prepared: "완제품",
  instant: "인스턴트",
  sauce: "소스",
  seasoning: "조미료",
  oil: "기름",
  other: "기타",
};

export const DEFAULT_SHELF_LIFE_DAYS = {
  egg: { fridge: 21 },
  meat: { fridge: 5, freezer: 90 },
  seafood: { fridge: 2, freezer: 90 },
  vegetable: { fridge: 7, freezer: 30, room: 14 },
  dairy: { fridge: 14, freezer: 90 },
  tofu: { fridge: 7 },
  grain: { fridge: 3, freezer: 30, room: 2 },
  noodle: { room: 180 },
  bread: { room: 4, fridge: 5, freezer: 90 },
  prepared: { fridge: 7, freezer: 30 },
  frozenFood: { freezer: 180 },
  instant: { room: 180 },
  sauce: { fridge: 90, room: 180 },
  seasoning: { fridge: 30, room: 180 },
};

export const CATEGORY_ICONS = {
  egg: "🥚",
  meat: "🥩",
  seafood: "🐟",
  vegetable: "🥬",
  dairy: "🧀",
  tofu: "◻️",
  grain: "🍚",
  noodle: "🍜",
  bread: "🍞",
  frozenFood: "🥟",
  canned: "🥫",
  prepared: "🍱",
  instant: "🍜",
  sauce: "🥫",
  seasoning: "🧂",
  oil: "🫙",
  other: "🥣",
};

export const LONG_TERM_CATEGORIES = new Set(["canned", "sauce", "seasoning", "oil"]);

