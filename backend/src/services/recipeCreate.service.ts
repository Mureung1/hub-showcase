import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

import {
  type Ingredient,
  isRecord,
  type RecipeSource,
  type RecipeStep,
} from "./recipeStructureContract.js";
import {
  parseSourceUrl,
  resolvePublicAddress,
  UrlContentError,
} from "./urlContent.service.js";

type RecipeType = "OWNED" | "EXTERNAL";

type FirebaseRecipeUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

type CreateRecipeRequest = {
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  source: RecipeSource | null;
  memo: string | null;
};

type CreateRecipeResult = {
  id: string;
  type: RecipeType;
};

export class RecipeCreateValidationError extends Error {
  constructor() {
    super("VALIDATION_ERROR");
  }
}

const REQUEST_KEYS = [
  "title",
  "description",
  "servings",
  "cookingTimeMinutes",
  "ingredients",
  "steps",
  "source",
  "memo",
] as const;

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
) {
  const actualKeys = Object.keys(value);

  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key))
  );
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function hasSequentialOrders(items: Array<{ order: number }>) {
  const orders = new Set(items.map(({ order }) => order));

  return (
    orders.size === items.length &&
    items.every(
      ({ order }) =>
        Number.isSafeInteger(order) && order >= 1 && order <= items.length,
    )
  );
}

function normalizeIngredients(value: unknown): Ingredient[] {
  if (!Array.isArray(value)) {
    throw new RecipeCreateValidationError();
  }

  const ingredients = value.filter(
    (ingredient) =>
      !(
        isRecord(ingredient) &&
        typeof ingredient.name === "string" &&
        ingredient.name.trim().length === 0
      ),
  );

  if (
    ingredients.length === 0 ||
    !ingredients.every(
      (ingredient): ingredient is Record<string, unknown> =>
        isRecord(ingredient) &&
        hasExactKeys(ingredient, ["name", "amount", "unit", "order"]) &&
        typeof ingredient.name === "string" &&
        ingredient.name.trim().length > 0 &&
        isNullableString(ingredient.amount) &&
        isNullableString(ingredient.unit) &&
        typeof ingredient.order === "number" &&
        Number.isSafeInteger(ingredient.order) &&
        ingredient.order >= 1,
    )
  ) {
    throw new RecipeCreateValidationError();
  }

  const normalizedIngredients = ingredients.map((ingredient) => ({
    name: (ingredient.name as string).trim(),
    amount:
      typeof ingredient.amount === "string"
        ? ingredient.amount.trim()
        : null,
    unit:
      typeof ingredient.unit === "string"
        ? ingredient.unit.trim()
        : null,
    order: ingredient.order as number,
  }));

  if (!hasSequentialOrders(normalizedIngredients)) {
    throw new RecipeCreateValidationError();
  }

  return normalizedIngredients;
}

function normalizeSteps(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) {
    throw new RecipeCreateValidationError();
  }

  const steps = value.filter(
    (step) =>
      !(
        isRecord(step) &&
        typeof step.description === "string" &&
        step.description.trim().length === 0
      ),
  );

  if (
    steps.length === 0 ||
    !steps.every(
      (step): step is Record<string, unknown> =>
        isRecord(step) &&
        hasExactKeys(step, ["order", "description"]) &&
        typeof step.order === "number" &&
        Number.isSafeInteger(step.order) &&
        step.order >= 1 &&
        typeof step.description === "string" &&
        step.description.trim().length > 0,
    )
  ) {
    throw new RecipeCreateValidationError();
  }

  const normalizedSteps = steps.map((step) => ({
    order: step.order as number,
    description: (step.description as string).trim(),
  }));

  if (!hasSequentialOrders(normalizedSteps)) {
    throw new RecipeCreateValidationError();
  }

  return normalizedSteps;
}

async function normalizeSource(value: unknown): Promise<RecipeSource | null> {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["url", "title", "author"]) ||
    typeof value.url !== "string" ||
    !isNullableString(value.title) ||
    !isNullableString(value.author)
  ) {
    throw new RecipeCreateValidationError();
  }

  const sourceUrl = value.url.trim();
  const parsedUrl = parseSourceUrl(sourceUrl);

  try {
    await resolvePublicAddress(parsedUrl);
  } catch (error) {
    if (
      error instanceof UrlContentError &&
      error.code === "URL_FETCH_FAILED"
    ) {
      throw new UrlContentError("URL_NOT_ALLOWED");
    }

    throw error;
  }

  return {
    url: sourceUrl,
    title: typeof value.title === "string" ? value.title.trim() : null,
    author: typeof value.author === "string" ? value.author.trim() : null,
  };
}

async function normalizeRequest(
  value: unknown,
): Promise<CreateRecipeRequest> {
  if (!isRecord(value) || !hasExactKeys(value, REQUEST_KEYS)) {
    throw new RecipeCreateValidationError();
  }

  if (
    typeof value.title !== "string" ||
    value.title.trim().length === 0 ||
    !isNullableString(value.description) ||
    !isNullableString(value.servings) ||
    !isNullableString(value.memo)
  ) {
    throw new RecipeCreateValidationError();
  }

  const cookingTimeMinutes = value.cookingTimeMinutes;

  if (
    cookingTimeMinutes !== null &&
    (typeof cookingTimeMinutes !== "number" ||
      !Number.isSafeInteger(cookingTimeMinutes) ||
      cookingTimeMinutes < 0 ||
      cookingTimeMinutes > 2_147_483_647)
  ) {
    throw new RecipeCreateValidationError();
  }

  return {
    title: value.title.trim(),
    description:
      typeof value.description === "string"
        ? value.description.trim()
        : null,
    servings:
      typeof value.servings === "string" ? value.servings.trim() : null,
    cookingTimeMinutes,
    ingredients: normalizeIngredients(value.ingredients),
    steps: normalizeSteps(value.steps),
    source: await normalizeSource(value.source),
    memo:
      typeof value.memo === "string" && value.memo.trim().length > 0
        ? value.memo.trim()
        : null,
  };
}

export async function createRecipe(
  pool: Pick<Pool, "connect">,
  firebaseUser: FirebaseRecipeUser,
  requestBody: unknown,
): Promise<CreateRecipeResult> {
  const request = await normalizeRequest(requestBody);
  const type: RecipeType = request.source === null ? "OWNED" : "EXTERNAL";
  const recipeId = randomUUID();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query<{ id: string }>(
      `
        INSERT INTO users (
          id,
          firebase_uid,
          email,
          name,
          profile_image_url
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (firebase_uid) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          profile_image_url = EXCLUDED.profile_image_url,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `,
      [
        randomUUID(),
        firebaseUser.uid,
        firebaseUser.email ?? null,
        firebaseUser.name ?? null,
        firebaseUser.picture ?? null,
      ],
    );
    const ownerId = userResult.rows[0]?.id;

    if (!ownerId) {
      throw new Error("Service user was not returned");
    }

    await client.query(
      `
        INSERT INTO recipes (
          id,
          owner_id,
          type,
          title,
          description,
          servings,
          cooking_time_minutes,
          memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        recipeId,
        ownerId,
        type,
        request.title,
        request.description,
        request.servings,
        request.cookingTimeMinutes,
        request.memo,
      ],
    );

    for (const ingredient of request.ingredients) {
      await client.query(
        `
          INSERT INTO ingredients (
            recipe_id,
            position,
            name,
            amount,
            unit
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          recipeId,
          ingredient.order,
          ingredient.name,
          ingredient.amount,
          ingredient.unit,
        ],
      );
    }

    for (const step of request.steps) {
      await client.query(
        `
          INSERT INTO recipe_steps (
            recipe_id,
            position,
            description
          )
          VALUES ($1, $2, $3)
        `,
        [recipeId, step.order, step.description],
      );
    }

    if (request.source !== null) {
      await client.query(
        `
          INSERT INTO recipe_sources (
            recipe_id,
            url,
            title,
            author
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          recipeId,
          request.source.url,
          request.source.title,
          request.source.author,
        ],
      );
    }

    await client.query("COMMIT");

    return {
      id: recipeId,
      type,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original database error.
    }

    throw error;
  } finally {
    client.release();
  }
}
