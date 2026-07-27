import { Router } from "express";
import { createFeedController } from "../controllers/feedController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createFeedRouter(options = {}) {
  const router = Router();
  const controller = createFeedController(options.getAuthenticatedSupabase);

  router.use(createRequireAuth(options.getSupabase));
  router.get("/", controller.list);

  return router;
}

