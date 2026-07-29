import { isPantryIngredientName } from "./pantry.js";
import { convertQuantityToStandard } from "../../../shared/quantityUnits.js";
import { isLiquidIngredient } from "./deductibleIngredients.js";

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
    .filter((ingredient) => !isPantryIngredientName(ingredient.name) && !isLiquidIngredient(ingredient))
    .map((ingredient) => {
      const normalizedName = normalizeIngredientName(ingredient.name);
      const ownedIngredient = ownedByName.get(normalizedName);
      const ownedQuantity = convertQuantityToStandard(ownedIngredient?.quantity, ownedIngredient?.unit);
      const recipeQuantity = convertQuantityToStandard(ingredient.amount, ingredient.unit);
      const isMissing = missingNames.has(normalizedName) || !ownedIngredient;
      const unitsMatch = Boolean(ownedQuantity && recipeQuantity
        && ownedQuantity.unit === recipeQuantity.unit);
      const hasTrackedQuantity = ownedIngredient?.quantityMode === "exact"
        && Boolean(ownedQuantity);
      const hasEnough = hasTrackedQuantity && unitsMatch
        && ownedQuantity.quantity >= recipeQuantity.quantity;
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
        amount: recipeQuantity?.quantity ?? ingredient.amount,
        unit: recipeQuantity?.unit ?? ingredient.unit,
        availableQuantity: ownedQuantity?.quantity ?? ownedIngredient?.quantity ?? null,
        availableUnit: ownedQuantity?.unit ?? ownedIngredient?.unit ?? null,
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
