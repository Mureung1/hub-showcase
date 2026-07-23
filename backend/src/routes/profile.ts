import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

export const profileRouter = Router();

interface ProfileRow {
  id: number;
  email: string;
  name: string | null;
  gender: "male" | "female" | "other";
  birth_year: number;
  is_pregnant_or_lactating: boolean | null;
  height_cm: number;
  weight_kg: number;
}

const VALID_GENDERS = ["male", "female", "other"];

profileRouter.put("/", requireAuth, async (req, res) => {
  const { gender, birthYear, isPregnantOrLactating, heightCm, weightKg } = req.body as {
    gender?: string;
    birthYear?: number;
    isPregnantOrLactating?: boolean;
    heightCm?: number;
    weightKg?: number;
  };

  if (
    !gender ||
    !VALID_GENDERS.includes(gender) ||
    typeof birthYear !== "number" ||
    typeof heightCm !== "number" ||
    typeof weightKg !== "number"
  ) {
    res.status(400).json({ error: "gender, birthYear, heightCm, weightKg는 필수입니다." });
    return;
  }

  const pregnantOrLactating = gender === "female" ? Boolean(isPregnantOrLactating) : null;

  const result = await pool.query<ProfileRow>(
    `UPDATE users
     SET gender = $1, birth_year = $2, is_pregnant_or_lactating = $3, height_cm = $4, weight_kg = $5
     WHERE id = $6
     RETURNING id, email, name, gender, birth_year, is_pregnant_or_lactating, height_cm, weight_kg`,
    [gender, birthYear, pregnantOrLactating, heightCm, weightKg, req.user!.userId]
  );

  const user = result.rows[0];
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    gender: user.gender,
    birthYear: user.birth_year,
    isPregnantOrLactating: user.is_pregnant_or_lactating,
    heightCm: user.height_cm,
    weightKg: user.weight_kg,
  });
});
