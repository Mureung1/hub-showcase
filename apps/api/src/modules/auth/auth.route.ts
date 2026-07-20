import { Router } from "express";

import { requireAuth } from "./auth.middleware.js";
import { getMe } from "./me.controller.js";

/**
 * 인증 라우트 (SPEC-AUTH-003 2.4).
 * GET /api/auth/me — requireAuth(JWT 검증) → getMe(Controller).
 */
export const authRouter = Router();

authRouter.get("/me", requireAuth, getMe);
