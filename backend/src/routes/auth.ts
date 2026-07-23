import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";

export const authRouter = Router();

interface UserRow {
  id: number;
  email: string;
  password: string;
  name: string | null;
  created_at: Date;
  gender: "male" | "female" | null;
  birth_year: number | null;
  is_pregnant_or_lactating: boolean | null;
  height_cm: number | null;
  weight_kg: number | null;
}

authRouter.post("/signup", async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "email, password는 필수입니다." });
    return;
  }

  const existing = await pool.query<UserRow>("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "이미 가입된 이메일입니다." });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query<UserRow>(
    "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at, gender, birth_year, is_pregnant_or_lactating, height_cm, weight_kg",
    [email, hashedPassword, name ?? null]
  );

  const user = result.rows[0];
  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    gender: user.gender,
    birthYear: user.birth_year,
    isPregnantOrLactating: user.is_pregnant_or_lactating,
    heightCm: user.height_cm,
    weightKg: user.weight_kg,
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email, password는 필수입니다." });
    return;
  }

  const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;
  if (!user || !passwordMatches) {
    res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      gender: user.gender,
      birthYear: user.birth_year,
      isPregnantOrLactating: user.is_pregnant_or_lactating,
      heightCm: user.height_cm,
      weightKg: user.weight_kg,
    },
  });
});
