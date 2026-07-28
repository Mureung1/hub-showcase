import { Router } from "express";
import { createRecapsController } from "../controllers/recapsController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createRecapsRouter(options = {}) {
  const router = Router();
  const controller = createRecapsController(options.getAuthenticatedSupabase);

  router.use(createRequireAuth(options.getSupabase));
  router.get("/monthly", controller.monthly);

  return router;
}
