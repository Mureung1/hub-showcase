import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import { getUserSpec, saveUserSpec } from "../services/specService.js";

export const specRouter = Router();

specRouter.use(requireAuth);

specRouter.get("/me", async (request, response, next) => {
  try {
    const spec = await getUserSpec(request.user.id);
    response.json({ ok: true, spec });
  } catch (error) {
    next(error);
  }
});

specRouter.post("/", async (request, response, next) => {
  try {
    const spec = await saveUserSpec({
      userId: request.user.id,
      spec: request.body,
    });

    response.json({ ok: true, spec });
  } catch (error) {
    next(error);
  }
});
