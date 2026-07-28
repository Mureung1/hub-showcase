import { Router, type Request, type Response } from "express";
import { requireFirebaseAuth } from "../middlewares/requireFirebaseAuth.js";
import { randomUUID } from "node:crypto";
import { databasePool } from "../database.js";

const router = Router();

router.get("/me", requireFirebaseAuth, async (req: Request, res: Response) => {
  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
    });
  }

  const result = await databasePool.query<{
    id: string;
    email: string | null;
    name: string | null;
    profile_image_url: string | null;
  }>(
    `
      INSERT INTO users (
        id,
        firebase_uid,
        email,
        name,
        profile_image_url
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (firebase_uid) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        profile_image_url = EXCLUDED.profile_image_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, name, profile_image_url
    `,
    [
      randomUUID(),
      firebaseUser.uid,
      firebaseUser.email ?? null,
      firebaseUser.name ?? null,
      firebaseUser.picture ?? null,
    ],
  );

  const serviceUser = result.rows[0];

  if (!serviceUser) {
    throw new Error("Service user가 반환되지 않았습니다.")
  }

  return res.status(200).json({
    data: {
      id: serviceUser.id,
      email: serviceUser.email,
      name: serviceUser.name,
      profileImageUrl: serviceUser.profile_image_url,
    },
  });
});

export default router;