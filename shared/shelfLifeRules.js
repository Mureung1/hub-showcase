export const SHELF_LIFE_RULES = {
  egg: { fridge: 21 },
  meat: { fridge: 3, freezer: 7 },
  seafood: { fridge: 2, freezer: 7 },
  vegetable: { fridge: 7, freezer: 30, room: 3 },
  dairy: { fridge: 7, freezer: 14 },
  tofu: { fridge: 5, freezer: 14 },
  grain: { fridge: 3, freezer: 30, room: 2 },
  noodle: { room: 90 },
  bread: { fridge: 3, freezer: 14, room: 3 },
  frozenFood: { freezer: 30 },
  canned: { room: 90 },
  prepared: { fridge: 3, freezer: 7 },
  instant: { room: 90 },
  sauce: { fridge: 30, room: 90 },
  seasoning: { room: 90 },
  oil: { fridge: 90, room: 90 },
  other: { fridge: 7, freezer: 30, room: 3 },
};

export const CHECK_DATE_CATEGORIES = new Set(["noodle", "canned", "instant", "sauce", "seasoning", "oil"]);
