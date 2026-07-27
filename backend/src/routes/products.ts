import { Router } from "express";
import { pool } from "../db";
import { buildOverlapResult } from "../utils/overlap";
import { requireAuth } from "../middleware/auth";

export const productsRouter = Router();

interface UserProfileRow {
  gender: "male" | "female" | null;
  birth_year: number | null;
  is_pregnant_or_lactating: boolean | null;
}

interface NutritionProfile {
  gender: "male" | "female" | null;
  age: number | null;
  isPregnantOrLactating: boolean;
}

async function getUserNutritionProfile(userId: number): Promise<NutritionProfile> {
  const result = await pool.query<UserProfileRow>(
    "SELECT gender, birth_year, is_pregnant_or_lactating FROM users WHERE id = $1",
    [userId]
  );
  const profile = result.rows[0];
  const gender = profile?.gender === "male" || profile?.gender === "female" ? profile.gender : null;
  const age = profile?.birth_year != null ? new Date().getFullYear() - profile.birth_year : null;
  return {
    gender,
    age,
    isPregnantOrLactating: profile?.is_pregnant_or_lactating ?? false,
  };
}

interface MatchedProductRow {
  id: number;
  name: string;
  company_name: string | null;
  price: number | null;
  description: string | null;
  haccp_certified: boolean;
  smartstore_url: string | null;
  test_report_url: string | null;
  match_count: string;
  matched_ingredient_names: string[];
  exceeds_personal_limit: boolean;
  pregnancy_caution: boolean;
}

productsRouter.get("/match", requireAuth, async (req, res) => {
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

  const { gender, age, isPregnantOrLactating } = await getUserNutritionProfile(req.user!.userId);

  const result = await pool.query<MatchedProductRow>(
    `SELECT p.id, p.name, p.company_name, p.price, p.description, p.haccp_certified, p.smartstore_url, p.test_report_url,
            COUNT(*) AS match_count,
            array_agg(DISTINCT i.name) AS matched_ingredient_names,
            bool_or(pi.amount_mg IS NOT NULL AND pi.amount_mg > COALESCE(u.upper_limit_mg, i.upper_limit_mg))
              AS exceeds_personal_limit,
            bool_or(i.pregnancy_caution AND $4) AS pregnancy_caution
     FROM product_ingredients pi
     JOIN products p ON p.id = pi.product_id
     JOIN ingredients i ON i.id = pi.ingredient_id
     LEFT JOIN ingredient_upper_limits u
       ON u.ingredient_id = i.id
       AND u.gender = $2
       AND $3 >= u.min_age
       AND (u.max_age IS NULL OR $3 <= u.max_age)
     WHERE pi.ingredient_id = ANY($1::int[])
     GROUP BY p.id, p.name, p.company_name, p.price, p.description, p.haccp_certified, p.smartstore_url, p.test_report_url
     ORDER BY exceeds_personal_limit ASC, pregnancy_caution ASC, match_count DESC
     LIMIT 10`,
    [ingredientIds, gender, age, isPregnantOrLactating]
  );

  const matchedProducts = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    price: row.price,
    description: row.description,
    haccpCertified: row.haccp_certified,
    smartstoreUrl: row.smartstore_url,
    testReportUrl: row.test_report_url,
    matchCount: Number(row.match_count),
    matchedIngredientNames: row.matched_ingredient_names,
    exceedsPersonalLimit: row.exceeds_personal_limit,
    pregnancyCaution: row.pregnancy_caution,
  }));

  res.json({ matchedProducts });
});

interface OverlapRow {
  ingredient_id: number;
  ingredient_name: string;
  upper_limit_mg: string | null;
  rda_mg: string | null;
  total_amount_mg: string | null;
}

productsRouter.post("/check-overlap", requireAuth, async (req, res) => {
  const { productNames } = req.body as { productNames?: string[] };

  if (!productNames || !Array.isArray(productNames) || productNames.length === 0) {
    res.status(400).json({ error: "productNames는 최소 1개 이상의 문자열 배열이어야 합니다." });
    return;
  }

  const { gender, age } = await getUserNutritionProfile(req.user!.userId);

  const result = await pool.query<OverlapRow>(
    `SELECT i.id AS ingredient_id, i.name AS ingredient_name,
            COALESCE(u.upper_limit_mg, i.upper_limit_mg) AS upper_limit_mg,
            u.rda_mg AS rda_mg,
            SUM(pi.amount_mg) AS total_amount_mg
     FROM product_ingredients pi
     JOIN products p ON p.id = pi.product_id
     JOIN ingredients i ON i.id = pi.ingredient_id
     LEFT JOIN ingredient_upper_limits u
       ON u.ingredient_id = i.id
       AND u.gender = $2
       AND $3 >= u.min_age
       AND (u.max_age IS NULL OR $3 <= u.max_age)
     WHERE EXISTS (
       SELECT 1 FROM unnest($1::text[]) AS term
       WHERE p.name ILIKE '%' || term || '%'
     )
     GROUP BY i.id, i.name, i.upper_limit_mg, u.upper_limit_mg, u.rda_mg`,
    [productNames, gender, age]
  );

  const overlapResults = result.rows.map(buildOverlapResult);

  res.json({ overlapResults });
});
