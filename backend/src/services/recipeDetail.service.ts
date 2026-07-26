import type { Pool } from "pg";

import type {
  Ingredient,
  RecipeSource,
  RecipeStep,
} from "./recipeStructureContract.js";

type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

type RecipeRow = {
  id: string;
  owner_id: string;
  type: RecipeType;
  title: string;
  description: string | null;
  servings: string | null;
  cooking_time_minutes: number | null;
  memo: string | null;
  source_url: string | null;
  source_title: string | null;
  source_author: string | null;
  original_owner_name: string | null;
  original_owner_profile_image_url: string | null;
  sender_display_name: string | null;
  relationship_label: string | null;
  received_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type IngredientRow = {
  name: string;
  amount: string | null;
  unit: string | null;
  position: number;
};

type RecipeStepRow = {
  position: number;
  description: string;
};

type RecipeDetail = {
  id: string;
  ownerId: string;
  type: RecipeType;
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  source: RecipeSource | null;
  memo: string | null;
  receivedInfo: {
    originalOwner: {
      name: string;
      profileImageUrl: string | null;
    };
    senderDisplayName: string;
    relationshipLabel: string;
    receivedAt: string;
    canReshare: false;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export class RecipeNotFoundError extends Error {
  constructor() {
    super("RECIPE_NOT_FOUND");
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRecipeDetail(
  pool: Pick<Pool, "query">,
  firebaseUid: string,
  recipeId: string,
): Promise<RecipeDetail> {
  if (!UUID_PATTERN.test(recipeId)) {
    throw new RecipeNotFoundError();
  }

  const recipeResult = await pool.query<RecipeRow>(
    `
      SELECT
        recipes.id,
        recipes.owner_id,
        recipes.type,
        recipes.title,
        recipes.description,
        recipes.servings,
        recipes.cooking_time_minutes,
        recipes.memo,
        recipe_sources.url AS source_url,
        recipe_sources.title AS source_title,
        recipe_sources.author AS source_author,
        received_recipe_details.original_owner_name,
        received_recipe_details.original_owner_profile_image_url,
        received_recipe_details.sender_display_name,
        received_recipe_details.relationship_label,
        received_recipe_details.received_at,
        recipes.created_at,
        recipes.updated_at
      FROM recipes
      INNER JOIN users ON users.id = recipes.owner_id
      LEFT JOIN recipe_sources ON recipe_sources.recipe_id = recipes.id
      LEFT JOIN received_recipe_details
        ON received_recipe_details.recipe_id = recipes.id
      WHERE recipes.id = $1
        AND users.firebase_uid = $2
        AND recipes.deleted_at IS NULL
      LIMIT 1
    `,
    [recipeId, firebaseUid],
  );
  const recipe = recipeResult.rows[0];

  if (!recipe) {
    throw new RecipeNotFoundError();
  }

  const [ingredientResult, stepResult] = await Promise.all([
    pool.query<IngredientRow>(
      `
        SELECT name, amount, unit, position
        FROM ingredients
        WHERE recipe_id = $1
        ORDER BY position ASC
      `,
      [recipeId],
    ),
    pool.query<RecipeStepRow>(
      `
        SELECT position, description
        FROM recipe_steps
        WHERE recipe_id = $1
        ORDER BY position ASC
      `,
      [recipeId],
    ),
  ]);

  if (
    recipe.type === "RECEIVED" &&
    (recipe.original_owner_name === null ||
      recipe.sender_display_name === null ||
      recipe.relationship_label === null ||
      recipe.received_at === null)
  ) {
    throw new Error("Received recipe details were not returned");
  }

  return {
    id: recipe.id,
    ownerId: recipe.owner_id,
    type: recipe.type,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    cookingTimeMinutes: recipe.cooking_time_minutes,
    ingredients: ingredientResult.rows.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      order: ingredient.position,
    })),
    steps: stepResult.rows.map((step) => ({
      order: step.position,
      description: step.description,
    })),
    source:
      recipe.source_url === null
        ? null
        : {
            url: recipe.source_url,
            title: recipe.source_title,
            author: recipe.source_author,
          },
    memo: recipe.memo,
    receivedInfo:
      recipe.type === "RECEIVED"
        ? {
            originalOwner: {
              name: recipe.original_owner_name!,
              profileImageUrl:
                recipe.original_owner_profile_image_url,
            },
            senderDisplayName: recipe.sender_display_name!,
            relationshipLabel: recipe.relationship_label!,
            receivedAt: recipe.received_at!.toISOString(),
            canReshare: false,
          }
        : null,
    createdAt: recipe.created_at.toISOString(),
    updatedAt: recipe.updated_at.toISOString(),
  };
}
