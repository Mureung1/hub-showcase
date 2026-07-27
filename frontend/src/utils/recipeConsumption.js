import { isPantryIngredientName } from "./pantry.js";

const INGREDIENT_ALIASES = new Map([
  ["달걀", "계란"],
  ["파", "대파"],
  ["쪽파", "대파"],
  ["돼지고기목살", "목살"],
  ["돼지목살", "목살"],
  ["참치캔", "참치통조림"],
]);

function normalizeIngredientName(name) {
  const normalized = String(name ?? "").trim().replaceAll(" ", "").toLowerCase();
  return INGREDIENT_ALIASES.get(normalized) ?? normalized;
}

function normalizeUnit(unit) {
  return String(unit ?? "").trim().replaceAll(" ", "").toLowerCase();
}

export function buildRecipeConsumptionRows(recipe, ingredients) {
  const missingNames = new Set((recipe?.missingIngredients ?? []).map(normalizeIngredientName));
  const ownedByName = new Map(ingredients.map((ingredient) => [
    normalizeIngredientName(ingredient.name),
    ingredient,
  ]));
  const recipeIngredients = [
    ...(recipe?.requiredIngredients ?? []).map((ingredient) => ({ ...ingredient, optional: false })),
    ...(recipe?.optionalIngredients ?? []).map((ingredient) => ({ ...ingredient, optional: true })),
  ];

  return recipeIngredients
    .filter((ingredient) => !isPantryIngredientName(ingredient.name))
    .map((ingredient) => {
      const normalizedName = normalizeIngredientName(ingredient.name);
      const ownedIngredient = ownedByName.get(normalizedName);
      const isMissing = missingNames.has(normalizedName) || !ownedIngredient;
      const unitsMatch = ownedIngredient
        && normalizeUnit(ownedIngredient.unit) === normalizeUnit(ingredient.unit);
      const hasTrackedQuantity = ownedIngredient?.quantityMode === "exact"
        && Number.isFinite(ownedIngredient.quantity);
      const hasEnough = hasTrackedQuantity && unitsMatch
        && ownedIngredient.quantity >= ingredient.amount;
      const status = isMissing
        ? "missing"
        : !hasTrackedQuantity
          ? "notTracked"
          : !unitsMatch
            ? "unitMismatch"
            : !hasEnough
              ? "insufficient"
              : "ready";

      return {
        id: ownedIngredient?.id ?? `missing-${normalizedName}`,
        ingredientId: ownedIngredient?.id ?? null,
        name: ingredient.name,
        ownedName: ownedIngredient?.name ?? null,
        amount: ingredient.amount,
        unit: ingredient.unit,
        availableQuantity: ownedIngredient?.quantity ?? null,
        availableUnit: ownedIngredient?.unit ?? null,
        optional: ingredient.optional,
        selected: status === "ready" && !ingredient.optional,
        status,
      };
    });
}

export function getConsumptionRequestItems(rows) {
  return rows
    .filter((row) => row.selected && row.status === "ready")
    .map((row) => ({
      id: row.ingredientId,
      amount: Number(row.amount),
      unit: row.unit,
    }));
}

