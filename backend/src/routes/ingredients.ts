import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

export const ingredientsRouter = Router();

interface RecommendedIngredientRow {
  id: number;
  name: string;
  category: string | null;
  upper_limit_mg: string | null;
  description: string | null;
  match_count: string;
}

ingredientsRouter.get("/recommend", requireAuth, async (req, res) => {
  const symptomIdsParam = req.query.symptomIds as string | undefined;

  if (!symptomIdsParam) {
    res.status(400).json({ error: "symptomIds 쿼리 파라미터는 필수입니다. 예: ?symptomIds=1,3,6" });
    return;
  }

  const symptomIds = symptomIdsParam
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id));

  if (symptomIds.length === 0) {
    res.status(400).json({ error: "symptomIds에 유효한 숫자가 없습니다." });
    return;
  }

  const result = await pool.query<RecommendedIngredientRow>(
    `SELECT i.id, i.name, i.category, i.upper_limit_mg, i.description, COUNT(*) AS match_count
     FROM symptom_ingredients si
     JOIN ingredients i ON i.id = si.ingredient_id
     WHERE si.symptom_id = ANY($1::int[])
     GROUP BY i.id, i.name, i.category, i.upper_limit_mg, i.description
     ORDER BY match_count DESC
     LIMIT 5`,
    [symptomIds]
  );

  const recommendedIngredients = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    upperLimitMg: row.upper_limit_mg,
    description: row.description,
    matchCount: Number(row.match_count),
  }));

  res.json({ recommendedIngredients });
});
