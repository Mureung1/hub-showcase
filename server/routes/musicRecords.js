import { Router } from "express";
import { createMusicRecordsController } from "../controllers/musicRecordsController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createMusicRecordsRouter(options = {}) {
  const router = Router();
  const controller = createMusicRecordsController(
    options.getAuthenticatedSupabase,
    options.getCurrentDate,
  );

  router.use(createRequireAuth(options.getSupabase));
  router.get("/", controller.list);
  router.post("/", controller.create);

  return router;
}
