import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

import { RecipeNotFoundError } from "./recipeDetail.service.js";

type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

type RecipeRow = {
  type: RecipeType;
  actor_user_id: string;
};

type DeletedRecipeRow = {
  deleted_at: Date;
};

type DeleteRecipeResult = {
  id: string;
  type: RecipeType;
  deletedAt: string;
  restoreUntil: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESTORE_WINDOW_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export async function deleteRecipe(
  pool: Pick<Pool, "connect">,
  firebaseUid: string,
  recipeId: string,
): Promise<DeleteRecipeResult> {
  if (!UUID_PATTERN.test(recipeId)) {
    throw new RecipeNotFoundError();
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const recipeResult = await client.query<RecipeRow>(
      `
        SELECT
          recipes.type,
          users.id AS actor_user_id
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

    const updateResult = await client.query<DeletedRecipeRow>(
      `
        UPDATE recipes
        SET
          deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING deleted_at
      `,
      [recipeId],
    );
    const deletedAt = updateResult.rows[0]?.deleted_at;

    if (!deletedAt) {
      throw new Error("Deleted recipe was not returned");
    }

    await client.query(
      `
        INSERT INTO recipe_audit_events (
          id,
          recipe_id,
          actor_user_id,
          action
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        randomUUID(),
        recipeId,
        recipe.actor_user_id,
        "DELETED",
      ],
    );

    await client.query("COMMIT");

    return {
      id: recipeId,
      type: recipe.type,
      deletedAt: deletedAt.toISOString(),
      restoreUntil: new Date(
        deletedAt.getTime() + RESTORE_WINDOW_MILLISECONDS,
      ).toISOString(),
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
