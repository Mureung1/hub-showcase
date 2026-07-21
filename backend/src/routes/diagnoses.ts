import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

export const diagnosesRouter = Router();

diagnosesRouter.post("/", requireAuth, async (req, res) => {
  const { symptomIds, ingredientIds } = req.body as {
    symptomIds?: number[];
    ingredientIds?: number[];
  };

  if (!symptomIds || !Array.isArray(symptomIds) || symptomIds.length === 0) {
    res.status(400).json({ error: "symptomIds는 최소 1개 이상의 배열이어야 합니다." });
    return;
  }
  if (!ingredientIds || !Array.isArray(ingredientIds)) {
    res.status(400).json({ error: "ingredientIds는 배열이어야 합니다." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const diagnosisResult = await client.query<{ id: number }>(
      "INSERT INTO diagnoses (user_id) VALUES ($1) RETURNING id",
      [req.user!.userId]
    );
    const diagnosisId = diagnosisResult.rows[0].id;

    for (const symptomId of symptomIds) {
      await client.query(
        "INSERT INTO diagnosis_symptoms (diagnosis_id, symptom_id) VALUES ($1, $2)",
        [diagnosisId, symptomId]
      );
    }
    for (const ingredientId of ingredientIds) {
      await client.query(
        "INSERT INTO diagnosis_ingredients (diagnosis_id, ingredient_id) VALUES ($1, $2)",
        [diagnosisId, ingredientId]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ id: diagnosisId });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "진단 결과 저장에 실패했습니다." });
  } finally {
    client.release();
  }
});

diagnosesRouter.get("/:id", requireAuth, async (req, res) => {
  const diagnosisId = Number(req.params.id);
  if (!Number.isInteger(diagnosisId)) {
    res.status(400).json({ error: "유효하지 않은 id입니다." });
    return;
  }

  const diagnosisResult = await pool.query(
    "SELECT id, user_id, life_pattern, created_at FROM diagnoses WHERE id = $1",
    [diagnosisId]
  );
  const diagnosis = diagnosisResult.rows[0];

  if (!diagnosis) {
    res.status(404).json({ error: "진단 기록을 찾을 수 없습니다." });
    return;
  }
  if (diagnosis.user_id !== req.user!.userId) {
    res.status(403).json({ error: "본인의 진단 기록만 조회할 수 있습니다." });
    return;
  }

  const symptomsResult = await pool.query(
    `SELECT s.id, s.name FROM diagnosis_symptoms ds
     JOIN symptoms s ON s.id = ds.symptom_id
     WHERE ds.diagnosis_id = $1`,
    [diagnosisId]
  );
  const ingredientsResult = await pool.query(
    `SELECT i.id, i.name FROM diagnosis_ingredients di
     JOIN ingredients i ON i.id = di.ingredient_id
     WHERE di.diagnosis_id = $1`,
    [diagnosisId]
  );

  res.json({
    id: diagnosis.id,
    createdAt: diagnosis.created_at,
    symptoms: symptomsResult.rows,
    ingredients: ingredientsResult.rows,
  });
});
