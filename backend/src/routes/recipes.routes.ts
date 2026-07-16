import { Router, type Request, type Response } from "express";

type Recipe = {
  id: number;
  title: string;
  description: string;
};

const router = Router();

const recipes: Recipe[] = [
  {
    id: 1,
    title: "김치찌개",
    description: "돼지고기를 넣은 김치찌개",
  },
];

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    data: recipes,
  });
});

router.get("/:recipeId", (req: Request, res: Response) => {
  const recipeId = Number(req.params.recipeId);

  const recipe = recipes.find((item) => item.id === recipeId);

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

  const newRecipe: Recipe = {
    id: recipes.length + 1,
    title: title.trim(),
    description: description?.trim() ?? "",
  };

  recipes.push(newRecipe);

  return res.status(201).json({
    data: newRecipe,
  });
});

export default router;
