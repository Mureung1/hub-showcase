import { Router, type Request, type Response } from "express";
import { requireFirebaseAuth } from "../middlewares/requireFirebaseAuth.js";

const router = Router();

router.get("/me", requireFirebaseAuth, (req: Request, res: Response) => {
  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
    });
  }

  return res.status(200).json({
    data: {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email ?? null,
      name: firebaseUser.name ?? null,
      profileImageUrl: firebaseUser.picture ?? null,
    },
  });
});

export default router;