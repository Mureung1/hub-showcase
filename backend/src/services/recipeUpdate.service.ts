import type { Pool } from "pg";

import {
  normalizeCreateRecipeRequest,
  RecipeCreateValidationError,
} from "./recipeCreate.service.js";
import {
  RecipeNotFoundError,
} from "./recipeDetail.service.js";
import { isRecord } from "./recipeStructureContract.js";

type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";
type EditableRecipeType = Exclude<RecipeType, "RECEIVED">;

type RecipeTypeRow = {
  type: RecipeType;
};

type UpdatedRecipeRow = {
  updated_at: Date;
};

type UpdateRecipeResult = {
  id: string;
  type: EditableRecipeType;
  updatedAt: string;
};

export class RecipeUpdateValidationError extends Error {
  constructor() {
    super("VALIDATION_ERROR");
  }
}

export class RecipeNotEditableError extends Error {
  constructor() {
    super("RECIPE_NOT_EDITABLE");
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UPDATE_REQUEST_KEYS = [
  "title",
  "description",
  "servings",
  "cookingTimeMinutes",
  "ingredients",
  "steps",
  "source",
] as const;

async function normalizeUpdateRequest(value: unknown) {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== UPDATE_REQUEST_KEYS.length ||
    !Object.keys(value).every((key) =>
      UPDATE_REQUEST_KEYS.includes(
        key as (typeof UPDATE_REQUEST_KEYS)[number],
      ),
    )
  ) {
    throw new RecipeUpdateValidationError();
  }

  try {
    const { memo: _memo, ...request } =
      await normalizeCreateRecipeRequest({
        ...value,
        memo: null,
      });

    return request;
  } catch (error) {
    if (error instanceof RecipeCreateValidationError) {
      throw new RecipeUpdateValidationError();
    }

    throw error;
  }
}

export async function updateRecipe(
  pool: Pick<Pool, "connect">,
  firebaseUid: string,
  recipeId: string,
  requestBody: unknown,
): Promise<UpdateRecipeResult> {
  if (!UUID_PATTERN.test(recipeId)) {
    throw new RecipeNotFoundError();
  }

  const request = await normalizeUpdateRequest(requestBody);
  const type: EditableRecipeType =
    request.source === null ? "OWNED" : "EXTERNAL";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const recipeResult = await client.query<RecipeTypeRow>(
      `
        SELECT recipes.type
        FROM recipes
        INNER JOIN users ON users.id = recipes.owner_id
        WHERE recipes.id = $1
          AND users.firebase_uid = $2
          AND recipes.deleted_at IS NULL
        FOR UPDATE
      `,
      [recipeId, firebaseUid],
    );
    const recipe = recipeResult.rows[0];

    if (!recipe) {
      throw new RecipeNotFoundError();
    }

    if (recipe.type === "RECEIVED") {
      throw new RecipeNotEditableError();
    }

    const updateResult = await client.query<UpdatedRecipeRow>(
      `
        UPDATE recipes
        SET
          type = $2,
          title = $3,
          description = $4,
          servings = $5,
          cooking_time_minutes = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING updated_at
      `,
      [
        recipeId,
        type,
        request.title,
        request.description,
        request.servings,
        request.cookingTimeMinutes,
      ],
    );
    const updatedAt = updateResult.rows[0]?.updated_at;

    if (!updatedAt) {
      throw new Error("Updated recipe was not returned");
    }

    await client.query(
      "DELETE FROM ingredients WHERE recipe_id = $1",
      [recipeId],
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

    await client.query(
      "DELETE FROM recipe_steps WHERE recipe_id = $1",
      [recipeId],
    );

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

    await client.query(
      "DELETE FROM recipe_sources WHERE recipe_id = $1",
      [recipeId],
    );

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
      updatedAt: updatedAt.toISOString(),
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
