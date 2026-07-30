import { CATEGORY_ICONS } from "../data/ingredientDefaults";
import { isCheckDateCategory } from "../data/shelfLifeRules";
import { sanitizeIngredientTags } from "../../../shared/ingredientTags";
import {
  formatDday,
  getDaysRemaining,
  getExpirationLabel,
  getExpirationSentence,
  getExpirationStatus,
  getIngredientDueDate,
  getTodayDateString,
} from "./expiration";

const INGREDIENT_STORAGE_LABELS = {
  fridge: "냉장",
  freezer: "냉동",
  room: "실온",
};

export function formatIngredientQuantity(ingredient) {
  if (ingredient.quantityMode === "notTracked" || ingredient.quantity === null) return "보유 중";
  return `${ingredient.quantity}${ingredient.unit ?? ""}`;
}

export function getIngredientStorageStatus(ingredient, referenceDate = new Date()) {
  const storageLabel = INGREDIENT_STORAGE_LABELS[ingredient.storage] ?? "기타";
  if (!ingredient.storedAt) return `${storageLabel} 보관 중`;

  const elapsedDays = Math.max(1, -getDaysRemaining(ingredient.storedAt, referenceDate) + 1);
  return `${elapsedDays}일째 ${storageLabel} 보관 중`;
}

export function parseQuantityInput(input) {
  const notTracked = { quantity: null, unit: null, quantityMode: "notTracked" };
  const value = input.trim();
  const fractionMatch = value.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (fractionMatch) {
    const denominator = Number(fractionMatch[2]);
    const unit = fractionMatch[3] || null;
    if (denominator === 0 || unit?.startsWith(".")) return notTracked;

    return {
      quantity: Number(fractionMatch[1]) / denominator,
      unit,
      quantityMode: "exact",
    };
  }

  if (value.includes("/")) return notTracked;

  const numberMatch = value.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!numberMatch || numberMatch[2].startsWith(".")) return notTracked;

  return {
    quantity: Number(numberMatch[1]),
    unit: numberMatch[2] || null,
    quantityMode: "exact",
  };
}

export function buildIngredientFromForm(formValues, existingIngredient = null) {
  const today = getTodayDateString();
  const quantityInput = formValues.unit
    ? `${formValues.quantity}${formValues.unit}`
    : formValues.quantity;
  const quantity = parseQuantityInput(quantityInput);
  const storage = formValues.storage;

  return {
    ...existingIngredient,
    id: existingIngredient?.id ?? `ingredient-${Date.now()}`,
    name: formValues.name.trim(),
    category: formValues.category,
    subcategory: existingIngredient?.subcategory ?? null,
    tags: sanitizeIngredientTags(formValues.tags),
    ...quantity,
    storage,
    expirationType: "absolute",
    expirationDate: formValues.expirationDate,
    shelfLifeDays: null,
    storedAt: today,
    recommendedUseBy: null,
    nextCheckDate: null,
    isStaple: ["grain", "noodle", "instant"].includes(formValues.category),
    isInstant: formValues.category === "instant",
    isPrepared: ["prepared", "frozenFood"].includes(formValues.category),
    isLongTerm: isCheckDateCategory(formValues.category),
    icon: existingIngredient?.icon ?? CATEGORY_ICONS[formValues.category] ?? CATEGORY_ICONS.other,
    memo: existingIngredient?.memo ?? "",
  };
}

export function getIngredientExpirationPresentation(ingredient) {
  const dueDate = getIngredientDueDate(ingredient);
  const daysRemaining = getDaysRemaining(dueDate);
  const status = getExpirationStatus(daysRemaining);

  if (ingredient.expirationType === "longTerm" && !dueDate) {
    return {
      badge: "보유 확인",
      daysRemaining: null,
      status: "neutral",
      label: "장기 보관 식품",
      sentence: "포장지 날짜와 보유 상태를 확인해 주세요.",
    };
  }

  if (isCheckDateCategory(ingredient.category)) {
    return {
      badge: formatDday(daysRemaining),
      daysRemaining,
      status,
      label: daysRemaining === null ? "보유 상태 확인" : `${Math.max(0, daysRemaining)}일 후 확인`,
      sentence: "포장지 날짜와 보유 상태를 우선 확인해 주세요.",
    };
  }

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
