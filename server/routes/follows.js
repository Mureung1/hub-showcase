import { Router } from "express";
import { createFollowsController } from "../controllers/followsController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createFollowsRouter(options = {}) {
  const router = Router();
  const controller = createFollowsController(options.getAuthenticatedSupabase);

  router.use(createRequireAuth(options.getSupabase));
  router.post("/", controller.create);
  router.delete("/:followingNickname", controller.remove);

  return router;
}
