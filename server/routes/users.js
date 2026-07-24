import { Router } from "express";
import { createUsersController } from "../controllers/usersController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createUsersRouter(options = {}) {
  const router = Router();
  const controller = createUsersController(options.getAuthenticatedSupabase);

  router.use(createRequireAuth(options.getSupabase));
  router.get("/", controller.list);

  return router;
}

