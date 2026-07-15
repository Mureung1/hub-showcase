import { CATEGORY_ICONS, DEFAULT_SHELF_LIFE_DAYS, INGREDIENT_CATEGORIES, LONG_TERM_CATEGORIES } from "../data/ingredientDefaults";
import {
  addDaysToDate,
  formatDday,
  getDaysRemaining,
  getExpirationLabel,
  getExpirationSentence,
  getExpirationStatus,
  getIngredientDueDate,
  getTodayDateString,
} from "./expiration";

export function formatIngredientQuantity(ingredient) {
  if (ingredient.quantityMode === "notTracked" || ingredient.quantity === null) return "보유 중";
  return `${ingredient.quantity}${ingredient.unit ?? ""}`;
}

export function getIngredientCategoryLabel(category) {
  return INGREDIENT_CATEGORIES[category] ?? INGREDIENT_CATEGORIES.other;
}

export function parseQuantityInput(input) {
  const value = input.trim();
  const fractionMatch = value.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (fractionMatch) {
    return {
      quantity: Number(fractionMatch[1]) / Number(fractionMatch[2]),
      unit: fractionMatch[3] || null,
      quantityMode: "exact",
    };
  }

  const numberMatch = value.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!numberMatch) return { quantity: null, unit: null, quantityMode: "notTracked" };
  return {
    quantity: Number(numberMatch[1]),
    unit: numberMatch[2] || null,
    quantityMode: "exact",
  };
}

export function buildIngredientFromForm(formValues, existingIngredient = null) {
  const today = getTodayDateString();
  const shelfLifeDays = Number(formValues.expiryDays);
  const quantity = parseQuantityInput(formValues.quantity);
  const isLongTerm = LONG_TERM_CATEGORIES.has(formValues.category);
  const storage = formValues.storage;
  const defaultShelfLife = DEFAULT_SHELF_LIFE_DAYS[formValues.category]?.[storage] ?? shelfLifeDays;
  const effectiveShelfLife = Number.isInteger(shelfLifeDays) ? shelfLifeDays : defaultShelfLife;

  return {
    ...existingIngredient,
    id: existingIngredient?.id ?? `ingredient-${Date.now()}`,
    name: formValues.name.trim(),
    category: formValues.category,
    subcategory: existingIngredient?.subcategory ?? null,
    tags: existingIngredient?.tags ?? [],
    ...quantity,
    storage,
    expirationType: isLongTerm ? "longTerm" : "relative",
    expirationDate: null,
    shelfLifeDays: isLongTerm ? null : effectiveShelfLife,
    storedAt: existingIngredient?.storedAt ?? today,
    recommendedUseBy: storage === "freezer" && !isLongTerm ? addDaysToDate(today, effectiveShelfLife) : null,
    nextCheckDate: isLongTerm ? addDaysToDate(today, 180) : null,
    isStaple: ["grain", "noodle", "instant"].includes(formValues.category),
    isInstant: formValues.category === "instant",
    isPrepared: ["prepared", "frozenFood"].includes(formValues.category),
    isLongTerm,
    icon: existingIngredient?.icon ?? CATEGORY_ICONS[formValues.category] ?? CATEGORY_ICONS.other,
    memo: existingIngredient?.memo ?? "",
  };
}

export function getIngredientExpirationPresentation(ingredient) {
  if (ingredient.expirationType === "longTerm") {
    return {
      badge: "보유 확인",
      daysRemaining: null,
      status: "neutral",
      label: "장기 보관 식품",
      sentence: "6개월 후 보유 상태를 확인해 주세요.",
    };
  }

  const dueDate = getIngredientDueDate(ingredient);
  const daysRemaining = getDaysRemaining(dueDate);
  const status = getExpirationStatus(daysRemaining);

  if (ingredient.storage === "freezer" && ingredient.storedAt) {
    const storedDays = Math.max(0, -getDaysRemaining(ingredient.storedAt));
    const storedWeeks = Math.max(1, Math.ceil(storedDays / 7));
    const remainingWeeks = Math.max(0, Math.ceil((daysRemaining ?? 0) / 7));
    return {
      badge: formatDday(daysRemaining),
      daysRemaining,
      status,
      label: `냉동 보관 ${storedWeeks}주째`,
      sentence: `약 ${remainingWeeks}주 안에 사용 권장`,
    };
  }

  return {
    badge: formatDday(daysRemaining),
    daysRemaining,
    status,
    label: getExpirationLabel(daysRemaining),
    sentence: getExpirationSentence(daysRemaining),
  };
}

