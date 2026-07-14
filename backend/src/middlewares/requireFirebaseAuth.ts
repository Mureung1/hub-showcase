import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAdminAuth } from "../firebaseAdmin.js";

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
    }
  }
}

export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
    });
  }

  const idToken = authorization.slice("Bearer ".length);

  try {
    req.firebaseUser = await firebaseAdminAuth.verifyIdToken(idToken);
    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "유효하지 않은 로그인 정보입니다.",
      },
    });
  }
}