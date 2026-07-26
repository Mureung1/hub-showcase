import { Router, type Request, type Response } from "express";
import { databasePool } from "../database.js";
import {
  createRecipe,
  RecipeCreateValidationError,
} from "../services/recipeCreate.service.js";
import {
  getRecipeDetail,
  RecipeNotFoundError,
} from "../services/recipeDetail.service.js";
import { UrlContentError } from "../services/urlContent.service.js";

type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

type RecipeSummaryRow = {
  id: string;
  type: RecipeType;
  title: string;
  description: string | null;
  source_url: string | null;
  source_title: string | null;
  source_author: string | null;
  original_owner_name: string | null;
  original_owner_profile_image_url: string | null;
  sender_display_name: string | null;
  relationship_label: string | null;
  received_at: Date | null;
  created_at: Date;
};

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
    });
  }

  const result = await databasePool.query<RecipeSummaryRow>(
    `
      SELECT
        recipes.id,
        recipes.type,
        recipes.title,
        recipes.description,
        recipe_sources.url AS source_url,
        recipe_sources.title AS source_title,
        recipe_sources.author AS source_author,
        received_recipe_details.original_owner_name,
        received_recipe_details.original_owner_profile_image_url,
        received_recipe_details.sender_display_name,
        received_recipe_details.relationship_label,
        received_recipe_details.received_at,
        recipes.created_at
      FROM recipes
      INNER JOIN users ON users.id = recipes.owner_id
      LEFT JOIN recipe_sources ON recipe_sources.recipe_id = recipes.id
      LEFT JOIN received_recipe_details
        ON received_recipe_details.recipe_id = recipes.id
      WHERE users.firebase_uid = $1
        AND recipes.deleted_at IS NULL
      ORDER BY recipes.created_at DESC
    `,
    [firebaseUser.uid],
  );

  return res.status(200).json({
    data: result.rows.map((recipe) => ({
      id: recipe.id,
      type: recipe.type,
      title: recipe.title,
      description: recipe.description,
      source:
        recipe.source_url === null
          ? null
          : {
              url: recipe.source_url,
              title: recipe.source_title,
              author: recipe.source_author,
            },
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
    })),
  });
});

router.get("/:recipeId", async (req: Request, res: Response) => {
  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
    });
  }

  try {
    const recipeId =
      typeof req.params.recipeId === "string"
        ? req.params.recipeId
        : "";
    const recipe = await getRecipeDetail(
      databasePool,
      firebaseUser.uid,
      recipeId,
    );

    return res.status(200).json({
      data: recipe,
    });
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      return res.status(404).json({
        error: {
          code: "RECIPE_NOT_FOUND",
          message: "레시피를 찾을 수 없습니다.",
        },
      });
    }

    throw error;
  }
});

router.post("/", async (req: Request, res: Response) => {
  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
    });
  }

  try {
    const recipe = await createRecipe(databasePool, firebaseUser, req.body);

    return res.status(201).json({
      data: recipe,
    });
  } catch (error) {
    if (error instanceof RecipeCreateValidationError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
        },
      });
    }

    if (error instanceof UrlContentError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message:
            error.code === "INVALID_URL"
              ? "URL 형식을 확인해 주세요."
              : "접근할 수 없는 URL입니다.",
        },
      });
    }

    throw error;
  }
});

export default router;
