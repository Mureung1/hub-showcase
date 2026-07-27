import { createHash, randomUUID } from "node:crypto";

import { sanitizeIngredientTags } from "../../shared/ingredientTags.js";

export const ASSUMED_PANTRY_INGREDIENTS = [
  "물",
  "조리된 밥",
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
  ["밥", "조리된밥"],
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
  const nutritionScore = Math.min(
    10,
    tags.filter((tag) => tag.startsWith("nutrition:")).length * 5,
  );
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
    servingStyle: recipe.servingStyle,
    cookingTechnique: recipe.cookingTechnique,
  };
  return createHash("sha256").update(JSON.stringify(fingerprintSource)).digest("hex");
}

function normalizeUnit(unit) {
  return String(unit ?? "").trim().replaceAll(" ", "").toLowerCase();
}

function isOwnedQuantityInsufficient(ownedIngredient, requiredIngredient) {
  if (!ownedIngredient || ownedIngredient.quantityMode !== "exact") return false;
  if (!Number.isFinite(ownedIngredient.quantity) || !Number.isFinite(requiredIngredient.amount)) return false;
  if (normalizeUnit(ownedIngredient.unit) !== normalizeUnit(requiredIngredient.unit)) return false;
  return requiredIngredient.amount > ownedIngredient.quantity;
}

function getPrimaryIngredientSet(recipe) {
  return new Set((recipe.primaryIngredients ?? []).map(normalizeIngredientName));
}

function setsEqual(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function getRecipeDifferenceCount(left, right) {
  return [
    left.dishType !== right.dishType,
    left.cookingTechnique !== right.cookingTechnique,
    left.servingStyle !== right.servingStyle,
    !setsEqual(getPrimaryIngredientSet(left), getPrimaryIngredientSet(right)),
  ].filter(Boolean).length;
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
  const seenFingerprints = new Set();

  const recipes = generated.recipes.map((recipe, index) => {
    const fingerprint = createRecipeFingerprint(recipe);
    const normalizedRecipeName = normalizeIngredientName(recipe.name);
    const requiredNames = new Set(recipe.requiredIngredients.map((ingredient) => normalizeIngredientName(ingredient.name)));
    const optionalNames = new Set(recipe.optionalIngredients.map((ingredient) => normalizeIngredientName(ingredient.name)));
    const missingIngredients = [...new Set(recipe.requiredIngredients
      .filter((ingredient) => {
        const normalizedName = normalizeIngredientName(ingredient.name);
        if (pantryNames.has(normalizedName)) return false;
        const ownedIngredient = ownedByName.get(normalizedName);
        return !ownedIngredient || isOwnedQuantityInsufficient(ownedIngredient, ingredient);
      })
      .map((ingredient) => ingredient.name))];

    if (seenNames.has(normalizedRecipeName)) {
      violations.push(`DUPLICATE_RECIPE_NAME: recipes.${index}.name이 이전 추천과 같습니다.`);
    }
    if (seenFingerprints.has(fingerprint) || excludedFingerprints.has(fingerprint)) {
      violations.push(`DUPLICATE_RECIPE: recipes.${index}가 이전 추천과 중복됩니다.`);
    }
    if (missingIngredients.length > request.maxMissingIngredients) {
      violations.push(`MISSING_INGREDIENT_LIMIT: recipes.${index}의 부족 재료가 ${request.maxMissingIngredients}개를 초과합니다.`);
    }
    if (recipe.servingStyle === "mealSet" && recipe.dishType !== "mealSet") {
      violations.push(`SERVING_STYLE_MISMATCH: recipes.${index}의 한 상 구성은 dishType도 mealSet이어야 합니다.`);
    }
    if (recipe.servingStyle === "singleDish" && recipe.dishType === "mealSet") {
      violations.push(`SERVING_STYLE_MISMATCH: recipes.${index}의 단일 요리는 mealSet dishType을 사용할 수 없습니다.`);
    }

    for (const primaryIngredient of recipe.primaryIngredients) {
      if (!requiredNames.has(normalizeIngredientName(primaryIngredient))) {
        violations.push(`PRIMARY_INGREDIENT_MISMATCH: recipes.${index}의 주재료 ${primaryIngredient}가 필수 재료에 없습니다.`);
      }
    }

    for (const component of recipe.components) {
      for (const ingredientName of component.ingredientNames) {
        const normalizedName = normalizeIngredientName(ingredientName);
        if (!requiredNames.has(normalizedName) && !optionalNames.has(normalizedName)) {
          violations.push(`MEAL_COMPONENT_MISMATCH: recipes.${index}의 ${component.name} 구성 재료 ${ingredientName}가 재료 목록에 없습니다.`);
        }
      }
    }

    seenNames.add(normalizedRecipeName);
    seenFingerprints.add(fingerprint);

    const dDayIngredients = recipe.requiredIngredients
      .map((ingredient) => ownedByName.get(normalizeIngredientName(ingredient.name)))
      .filter((ingredient) => ingredient?.daysRemaining === 0)
      .map((ingredient) => ingredient.name);
    const safetyNotes = [...recipe.safetyNotes];
    if (dDayIngredients.length > 0) {
      safetyNotes.unshift(`${dDayIngredients.join(", ")}은(는) 조리 전에 상태를 확인해 주세요.`);
    }

    return {
      ...recipe,
      id: `recipe-${randomUUID()}`,
      fingerprint,
      missingIngredients,
      safetyNotes: [...new Set(safetyNotes)].slice(0, 3),
    };
  });

  for (let leftIndex = 0; leftIndex < generated.recipes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < generated.recipes.length; rightIndex += 1) {
      if (getRecipeDifferenceCount(generated.recipes[leftIndex], generated.recipes[rightIndex]) < 2) {
        violations.push(
          `INSUFFICIENT_VARIETY: recipes.${leftIndex}와 recipes.${rightIndex}는 조리 형태·기법·주재료 중 두 가지 이상 달라야 합니다.`,
        );
      }
    }
  }

  if (violations.length > 0) throw new RecommendationPolicyError(violations);
  return recipes;
}
