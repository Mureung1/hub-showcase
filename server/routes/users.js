import { Router } from "express";
import { createUsersController } from "../controllers/usersController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createUsersRouter(options = {}) {
  const router = Router();
  const controller = createUsersController(
    options.getAuthenticatedSupabase,
    options.getCurrentDate,
  );

  router.use(createRequireAuth(options.getSupabase));
  router.get("/", controller.list);
  router.get("/:nickname/music-records", controller.musicRecords);
  router.get("/:nickname", controller.detail);

  return router;
}
