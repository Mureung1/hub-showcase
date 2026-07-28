export interface Ingredient {
  name: string;
  amount: string | null;
  unit: string | null;
  order: number;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface RecipeSource {
  url: string;
  title: string | null;
  author: string | null;
}

export interface RecipeDraft {
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  source: RecipeSource | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}

export interface RecipeWarning {
  field: string;
  message: string;
  suggestedValue: string | number | null;
}

export interface StructureRecipeResult {
  draft: RecipeDraft;
  warnings: RecipeWarning[];
}

export const RECIPE_STRUCTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    draft: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: {
          type: "string",
          minLength: 1,
        },
        description: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        servings: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        cookingTimeMinutes: {
          anyOf: [
            {
              type: "integer",
              minimum: 0,
            },
            { type: "null" },
          ],
        },
        ingredients: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: {
                type: "string",
                minLength: 1,
              },
              amount: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              unit: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              order: {
                type: "integer",
                minimum: 1,
              },
            },
            required: ["name", "amount", "unit", "order"],
          },
        },
        steps: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              order: {
                type: "integer",
                minimum: 1,
              },
              description: {
                type: "string",
                minLength: 1,
              },
            },
            required: ["order", "description"],
          },
        },
        source: {
          type: "null",
        },
      },
      required: [
        "title",
        "description",
        "servings",
        "cookingTimeMinutes",
        "ingredients",
        "steps",
        "source",
      ],
    },
    warnings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: {
            type: "string",
            minLength: 1,
          },
          message: {
            type: "string",
            minLength: 1,
          },
          suggestedValue: {
            anyOf: [
              { type: "string" },
              { type: "number" },
              { type: "null" },
            ],
          },
        },
        required: ["field", "message", "suggestedValue"],
      },
    },
  },
  required: ["draft", "warnings"],
} as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNullableString(value: unknown) {
  return typeof value === "string" || value === null;
}
function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}
function hasSequentialOrders(items: Array<{ order: number }>) {
  const orders = new Set(items.map(({ order }) => order));

  return (
    orders.size === items.length &&
    items.every(
      ({ order }) =>
        Number.isInteger(order) && order >= 1 && order <= items.length,
    )
  );
}

function isEditableWarningField(
  field: string,
  ingredientCount: number,
  stepCount: number,
): boolean {
  if (
    ["title", "description", "servings", "cookingTimeMinutes"].includes(field)
  ) {
    return true;
  }

  const ingredientMatch =
    /^ingredients\[(0|[1-9]\d*)\]\.(name|amount|unit)$/.exec(field);

  if (ingredientMatch) {
    return Number(ingredientMatch[1]) < ingredientCount;
  }

  const stepMatch =
    /^steps\[(0|[1-9]\d*)\]\.description$/.exec(field);

  if (stepMatch) {
    return Number(stepMatch[1]) < stepCount;
  }

  return false;
}

function isIngredient(value: unknown): value is Ingredient {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["name", "amount", "unit", "order"])
  ) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isNullableString(value.amount) &&
    isNullableString(value.unit) &&
    typeof value.order === "number" &&
    Number.isInteger(value.order) &&
    value.order >= 1
  );
}

function isRecipeStep(value: unknown): value is RecipeStep {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["order", "description"])
  ) {
    return false;
  }

  return (
    typeof value.order === "number" &&
    Number.isInteger(value.order) &&
    value.order >= 1 &&
    typeof value.description === "string" &&
    value.description.trim().length > 0
  );
}

function isRecipeWarning(
  value: unknown,
  ingredientCount: number,
  stepCount: number,
): value is RecipeWarning {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["field", "message", "suggestedValue"])
  ) {
    return false;
  }

  const isValidSuggestedValue =
    value.suggestedValue === null ||
    typeof value.suggestedValue === "string" ||
    (typeof value.suggestedValue === "number" &&
      Number.isFinite(value.suggestedValue));

  return (
    typeof value.field === "string" &&
    value.field.trim().length > 0 &&
    isEditableWarningField(value.field, ingredientCount, stepCount) &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    isValidSuggestedValue
  );
}

export function isStructureRecipeResult(
  value: unknown,
): value is StructureRecipeResult {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["draft", "warnings"]) ||
    !isRecord(value.draft) ||
    !Array.isArray(value.warnings)
  ) {
    return false;
  }

  const draft = value.draft;

  if (
    !hasOnlyKeys(draft, [
      "title",
      "description",
      "servings",
      "cookingTimeMinutes",
      "source",
      "ingredients",
      "steps",
    ]) ||
    typeof draft.title !== "string" ||
    draft.title.trim().length === 0 ||
    !isNullableString(draft.description) ||
    !isNullableString(draft.servings) ||
    draft.source !== null ||
    !Array.isArray(draft.ingredients) ||
    !Array.isArray(draft.steps)
  ) {
    return false;
  }

  const isValidCookingTime =
    draft.cookingTimeMinutes === null ||
    (typeof draft.cookingTimeMinutes === "number" &&
      Number.isInteger(draft.cookingTimeMinutes) &&
      draft.cookingTimeMinutes >= 0);

  if (
    !isValidCookingTime ||
    draft.ingredients.length === 0 ||
    !draft.ingredients.every(isIngredient) ||
    !hasSequentialOrders(draft.ingredients) ||
    draft.steps.length === 0 ||
    !draft.steps.every(isRecipeStep) ||
    !hasSequentialOrders(draft.steps)
  ) {
    return false;
  }

  const ingredientCount = draft.ingredients.length;
  const stepCount = draft.steps.length;

  return value.warnings.every((warning) =>
    isRecipeWarning(warning, ingredientCount, stepCount),
  );
}