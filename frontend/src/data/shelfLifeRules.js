import { addDaysToDate, getTodayDateString } from "../utils/expiration.js";
import { CHECK_DATE_CATEGORIES, SHELF_LIFE_RULES } from "../../../shared/shelfLifeRules.js";

export { CHECK_DATE_CATEGORIES, SHELF_LIFE_RULES } from "../../../shared/shelfLifeRules.js";

export const STORAGE_OPTIONS = [
  { id: "fridge", label: "냉장" },
  { id: "freezer", label: "냉동" },
  { id: "room", label: "실온" },
];

export function getAllowedStorageOptions(category) {
  const rule = SHELF_LIFE_RULES[category] ?? SHELF_LIFE_RULES.other;
  return STORAGE_OPTIONS.filter(({ id }) => Number.isInteger(rule[id]));
}

export function getDefaultStorage(category) {
  return getAllowedStorageOptions(category)[0]?.id ?? "fridge";
}

export function getSuggestedShelfLifeDays(category, storage) {
  return (SHELF_LIFE_RULES[category] ?? SHELF_LIFE_RULES.other)[storage] ?? null;
}

export function getSuggestedUseByDate(category, storage, baseDate = getTodayDateString()) {
  const days = getSuggestedShelfLifeDays(category, storage);
  return Number.isInteger(days) ? addDaysToDate(baseDate, days) : "";
}

export function isCheckDateCategory(category) {
  return CHECK_DATE_CATEGORIES.has(category);
}
