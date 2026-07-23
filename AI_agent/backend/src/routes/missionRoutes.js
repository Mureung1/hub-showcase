import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getMissionProgress,
  saveMissionProgress,
} from "../services/missionProgressService.js";

export const missionRouter = Router();

missionRouter.use(requireAuth);

missionRouter.get("/:missionId/progress", async (request, response, next) => {
  try {
    const progress = await getMissionProgress({
      userId: request.user.id,
      missionId: request.params.missionId,
    });

    response.json({ ok: true, progress });
  } catch (error) {
    next(error);
  }
});

missionRouter.patch("/:missionId/progress", async (request, response, next) => {
  try {
    const progress = await saveMissionProgress({
      userId: request.user.id,
      progress: {
        ...request.body,
        missionId: request.params.missionId,
      },
    });

    response.json({ ok: true, progress });
  } catch (error) {
    next(error);
  }
});
