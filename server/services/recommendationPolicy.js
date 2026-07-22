import { createHash, randomUUID } from "node:crypto";

import { sanitizeIngredientTags } from "../../shared/ingredientTags.js";

export const ASSUMED_PANTRY_INGREDIENTS = [
  "소금",
  "후추",
  "식용유",
  "고춧가루",
  "간장",
  "설탕",
  "식초",
  "다진 마늘",
];

const INGREDIENT_ALIASES = new Map([
  ["달걀", "계란"],
  ["파", "대파"],
  ["쪽파", "대파"],
  ["돼지고기목살", "목살"],
  ["돼지목살", "목살"],
  ["참치캔", "참치통조림"],
  ["식용기름", "식용유"],
  ["다진마늘", "다진마늘"],
]);

export class RecommendationPolicyError extends Error {
  constructor(violations) {
    super("생성된 레시피가 추천 정책을 충족하지 않습니다.");
    this.name = "RecommendationPolicyError";
    this.code = "INVALID_RECOMMENDATION";
    this.status = 502;
    this.retryable = true;
    this.violations = violations;
  }
}

export function normalizeIngredientName(name) {
  const normalized = String(name ?? "").trim().replaceAll(" ", "").toLowerCase();
  return INGREDIENT_ALIASES.get(normalized) ?? normalized;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getNextKstMidnight(date = new Date()) {
  const [year, month, day] = getKstDateString(date).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1) - 9 * 60 * 60 * 1000);
}

function getExpirationDate(row) {
  if (row.expiration_date) return row.expiration_date;
  if (row.expiration_type === "relative" && row.stored_at && Number.isInteger(row.shelf_life_days)) {
    return addDays(row.stored_at, row.shelf_life_days);
  }
  return null;
}

function getDaysRemaining(expirationDate, today) {
  if (!expirationDate) return null;
  const expiration = Date.parse(`${expirationDate}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  return Math.round((expiration - current) / 86_400_000);
}

function getPriorityScore(daysRemaining, tags) {
  const expirationScore = daysRemaining === null
    ? 0
    : daysRemaining <= 0
      ? 60
      : daysRemaining <= 2
        ? 50
        : daysRemaining <= 5
          ? 35
          : daysRemaining <= 7
            ? 20
            : daysRemaining <= 30
              ? 10
              : 0;
  const nutritionScore = tags.filter((tag) => tag.startsWith("nutrition:")).length * 5;
  const processingPenalty = tags.includes("processing:instant")
    ? 10
    : tags.includes("processing:processed")
      ? 5
      : 0;
  return Math.max(0, Math.min(100, expirationScore + nutritionScore - processingPenalty));
}

export function buildIngredientContext(rows, { today = getKstDateString() } = {}) {
  const availableIngredients = [];
  const excludedExpiredIngredients = [];

  for (const row of rows) {
    const tags = sanitizeIngredientTags(row.tags);
    const expirationDate = getExpirationDate(row);
    const daysRemaining = getDaysRemaining(expirationDate, today);
    const ingredient = {
      name: row.name,
      category: row.category,
      subcategory: row.subcategory ?? null,
      tags,
      quantity: row.quantity ?? null,
      unit: row.unit ?? null,
      quantityMode: row.quantity_mode,
      storage: row.storage,
      expirationType: row.expiration_type,
      expirationDate,
      storedAt: row.stored_at,
      daysRemaining,
      isStaple: Boolean(row.is_staple),
      isInstant: Boolean(row.is_instant),
      isPrepared: Boolean(row.is_prepared),
      priorityScore: getPriorityScore(daysRemaining, tags),
    };

    if (daysRemaining !== null && daysRemaining < 0) {
      excludedExpiredIngredients.push(ingredient);
    } else {
      availableIngredients.push(ingredient);
    }
  }

  availableIngredients.sort((left, right) => right.priorityScore - left.priorityScore
    || (left.daysRemaining ?? Number.POSITIVE_INFINITY) - (right.daysRemaining ?? Number.POSITIVE_INFINITY)
    || left.name.localeCompare(right.name, "ko"));

  const nutritionProfile = Object.fromEntries([
    "nutrition:carb",
    "nutrition:protein",
    "nutrition:vegetable",
    "nutrition:fat",
  ].map((tag) => [tag, availableIngredients.filter((ingredient) => ingredient.tags.includes(tag)).length]));

  return { availableIngredients, excludedExpiredIngredients, nutritionProfile };
}

export function createInventorySignature(ingredients) {
  const stableIngredients = ingredients.map((ingredient) => ({
    name: normalizeIngredientName(ingredient.name),
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    storage: ingredient.storage,
    daysRemaining: ingredient.daysRemaining,
    tags: [...ingredient.tags].sort(),
  })).sort((left, right) => left.name.localeCompare(right.name));
  return createHash("sha256").update(JSON.stringify(stableIngredients)).digest("hex");
}

export function createRecipeFingerprint(recipe) {
  const requiredNames = recipe.requiredIngredients
    .map((ingredient) => normalizeIngredientName(ingredient.name))
    .sort();
  const fingerprintSource = {
    name: normalizeIngredientName(recipe.name),
    requiredNames,
    dishType: recipe.dishType,
  };
  return createHash("sha256").update(JSON.stringify(fingerprintSource)).digest("hex");
}

function getModeViolation(recipe, mode) {
  if (mode === "noFire" && (recipe.cookingMethod !== "noFire" || recipe.cookingTime > 10)) {
    return "noFire 모드는 불을 사용하지 않고 10분 이내여야 합니다.";
  }
  if (mode === "quick" && recipe.cookingTime > 20) {
    return "quick 모드는 20분 이내여야 합니다.";
  }
  return null;
}

export function validateGeneratedRecipes(generated, request, ingredientContext) {
  const violations = [];
  const ownedByName = new Map(ingredientContext.availableIngredients.map((ingredient) => [
    normalizeIngredientName(ingredient.name),
    ingredient,
  ]));
  const pantryNames = new Set(ASSUMED_PANTRY_INGREDIENTS.map(normalizeIngredientName));
  const excludedFingerprints = new Set(request.excludedRecipeFingerprints);
  const seenNames = new Set();
  const seenDishTypes = new Set();
  const seenFingerprints = new Set();

  const recipes = generated.recipes.map((recipe, index) => {
    const fingerprint = createRecipeFingerprint(recipe);
    const normalizedRecipeName = normalizeIngredientName(recipe.name);
    const missingIngredients = recipe.requiredIngredients
      .map((ingredient) => ingredient.name)
      .filter((name) => {
        const normalizedName = normalizeIngredientName(name);
        return !ownedByName.has(normalizedName) && !pantryNames.has(normalizedName);
      });

    if (seenNames.has(normalizedRecipeName)) violations.push(`recipes.${index}.name: 중복 레시피명입니다.`);
    if (seenDishTypes.has(recipe.dishType)) violations.push(`recipes.${index}.dishType: 메뉴 형태가 중복됩니다.`);
    if (seenFingerprints.has(fingerprint) || excludedFingerprints.has(fingerprint)) {
      violations.push(`recipes.${index}: 이전 추천과 중복되는 레시피입니다.`);
    }
    if (missingIngredients.length > request.maxMissingIngredients) {
      violations.push(`recipes.${index}: 부족 재료가 ${request.maxMissingIngredients}개를 초과합니다.`);
    }
    const modeViolation = getModeViolation(recipe, request.mode);
    if (modeViolation) violations.push(`recipes.${index}: ${modeViolation}`);

    seenNames.add(normalizedRecipeName);
    seenDishTypes.add(recipe.dishType);
    seenFingerprints.add(fingerprint);

    const dDayIngredients = recipe.requiredIngredients
      .map((ingredient) => ownedByName.get(normalizeIngredientName(ingredient.name)))
      .filter((ingredient) => ingredient?.daysRemaining === 0)
      .map((ingredient) => ingredient.name);
    const safetyNotes = [...recipe.safetyNotes];
    if (dDayIngredients.length > 0) {
      safetyNotes.unshift(`${dDayIngredients.join(", ")}은(는) 오늘까지 사용하고 상태를 확인해 충분히 익혀주세요.`);
    }

    return {
      ...recipe,
      id: `recipe-${randomUUID()}`,
      fingerprint,
      missingIngredients,
      safetyNotes: [...new Set(safetyNotes)].slice(0, 3),
    };
  });

  if (violations.length > 0) throw new RecommendationPolicyError(violations);
  return recipes;
}
