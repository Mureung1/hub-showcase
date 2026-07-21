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

interface OverlapRow {
  ingredient_id: number;
  ingredient_name: string;
  upper_limit_mg: string | null;
  total_amount_mg: string | null;
}

productsRouter.post("/check-overlap", async (req, res) => {
  const { productNames } = req.body as { productNames?: string[] };

  if (!productNames || !Array.isArray(productNames) || productNames.length === 0) {
    res.status(400).json({ error: "productNames는 최소 1개 이상의 문자열 배열이어야 합니다." });
    return;
  }

  const result = await pool.query<OverlapRow>(
    `SELECT i.id AS ingredient_id, i.name AS ingredient_name, i.upper_limit_mg,
            SUM(pi.amount_mg) AS total_amount_mg
     FROM product_ingredients pi
     JOIN products p ON p.id = pi.product_id
     JOIN ingredients i ON i.id = pi.ingredient_id
     WHERE EXISTS (
       SELECT 1 FROM unnest($1::text[]) AS term
       WHERE p.name ILIKE '%' || term || '%'
     )
     GROUP BY i.id, i.name, i.upper_limit_mg`,
    [productNames]
  );

  const overlapResults = result.rows.map((row) => {
    const totalAmountMg = row.total_amount_mg === null ? null : Number(row.total_amount_mg);
    const upperLimitMg = row.upper_limit_mg === null ? null : Number(row.upper_limit_mg);
    const isExceeded = totalAmountMg !== null && upperLimitMg !== null && totalAmountMg > upperLimitMg;

    const message =
      totalAmountMg === null || upperLimitMg === null
        ? `${row.ingredient_name}은(는) 상한 섭취량 기준이 없어 초과 여부를 판단할 수 없어요.`
        : isExceeded
          ? `${row.ingredient_name}을(를) ${totalAmountMg}mg 드시고 있어요. 상한 섭취량(${upperLimitMg}mg)을 초과해서 부작용 위험이 있어요.`
          : `${row.ingredient_name}을(를) ${totalAmountMg}mg 드시고 있어요. 상한 섭취량(${upperLimitMg}mg) 이내예요.`;

    return {
      ingredientId: row.ingredient_id,
      ingredientName: row.ingredient_name,
      totalAmountMg,
      upperLimitMg,
      isExceeded,
      message,
    };
  });

  res.json({ overlapResults });
});
