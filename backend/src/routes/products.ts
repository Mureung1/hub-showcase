import { Router } from "express";
import { pool } from "../db";

export const productsRouter = Router();

interface MatchedProductRow {
  id: number;
  name: string;
  company_name: string | null;
  price: number | null;
  match_count: string;
}

productsRouter.get("/match", async (req, res) => {
  const ingredientIdsParam = req.query.ingredientIds as string | undefined;

  if (!ingredientIdsParam) {
    res.status(400).json({ error: "ingredientIds 쿼리 파라미터는 필수입니다. 예: ?ingredientIds=1,2" });
    return;
  }

  const ingredientIds = ingredientIdsParam
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id));

  if (ingredientIds.length === 0) {
    res.status(400).json({ error: "ingredientIds에 유효한 숫자가 없습니다." });
    return;
  }

  const result = await pool.query<MatchedProductRow>(
    `SELECT p.id, p.name, p.company_name, p.price, COUNT(*) AS match_count
     FROM product_ingredients pi
     JOIN products p ON p.id = pi.product_id
     WHERE pi.ingredient_id = ANY($1::int[])
     GROUP BY p.id, p.name, p.company_name, p.price
     ORDER BY match_count DESC
     LIMIT 10`,
    [ingredientIds]
  );

  const matchedProducts = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    price: row.price,
    matchCount: Number(row.match_count),
  }));

  res.json({ matchedProducts });
});
