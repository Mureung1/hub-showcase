import { Router, type Request, type Response } from "express";
import { databasePool } from "../database.js";

type PrototypeRecipe = {
  id: number;
  title: string;
  description: string;
};

type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

type RecipeSummaryRow = {
  id: string;
  type: RecipeType;
  title: string;
  description: string | null;
  source_url: string | null;
  source_title: string | null;
  source_author: string | null;
  created_at: Date;
};

const router = Router();

const prototypeRecipes: PrototypeRecipe[] = [
  {
    id: 1,
    title: "김치찌개",
    description: "돼지고기를 넣은 김치찌개",
  },
];

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
        recipes.created_at
      FROM recipes
      INNER JOIN users ON users.id = recipes.owner_id
      LEFT JOIN recipe_sources ON recipe_sources.recipe_id = recipes.id
      WHERE users.firebase_uid = $1
        AND recipes.deleted_at IS NULL
        AND recipes.type IN ('OWNED', 'EXTERNAL')
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
      receivedInfo: null,
      createdAt: recipe.created_at.toISOString(),
    })),
  });
});

router.get("/:recipeId", (req: Request, res: Response) => {
  const recipeId = Number(req.params.recipeId);

  const recipe = prototypeRecipes.find((item) => item.id === recipeId);

  if (!recipe) {
    return res.status(404).json({
      error: {
        code: "RECIPE_NOT_FOUND",
        message: "레시피를 찾을 수 없습니다.",
      },
    });
  }

  return res.status(200).json({
    data: recipe,
  });
});

router.post("/", (req: Request, res: Response) => {
  const { title, description } = req.body as {
    title?: string;
    description?: string;
  };

  if (!title?.trim()) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "입력값을 확인해 주세요.",
        details: [
          {
            field: "title",
            message: "레시피 제목은 필수입니다.",
          },
        ],
      },
    });
  }

  const newRecipe: PrototypeRecipe = {
    id: prototypeRecipes.length + 1,
    title: title.trim(),
    description: description?.trim() ?? "",
  };

  prototypeRecipes.push(newRecipe);

  return res.status(201).json({
    data: newRecipe,
  });
});

export default router;
