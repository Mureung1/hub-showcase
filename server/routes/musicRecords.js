import { Router } from "express";
import { createMusicRecordsController } from "../controllers/musicRecordsController.js";
import { createLikesController } from "../controllers/likesController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createMusicRecordsRouter(options = {}) {
  const router = Router();
  const controller = createMusicRecordsController(
    options.getAuthenticatedSupabase,
    options.getCurrentDate,
  );
  const likesController = createLikesController(options.getAuthenticatedSupabase);

  router.use(createRequireAuth(options.getSupabase));
  router.get("/:recordId/likes", likesController.list);
  router.post("/:recordId/likes", likesController.create);
  router.delete("/:recordId/likes", likesController.remove);
  router.get("/", controller.list);
  router.post("/", controller.create);

  return router;
}
