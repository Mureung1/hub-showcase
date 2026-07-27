import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import { getMySubmissions } from "../services/submissionService.js";
import { getRecommendedMissions } from "../services/missionRecommendationService.js";
import {
  getMissionProgress,
  saveMissionProgress,
} from "../services/missionProgressService.js";

export const missionRouter = Router();

missionRouter.use(requireAuth);

missionRouter.get("/recommendations", async (request, response, next) => {
  try {
    const submissions = await getMySubmissions(request.user.id);
    const recommendations = getRecommendedMissions({
      major: String(request.query.major || request.user.major || ""),
      targetRole: String(request.query.targetRole || ""),
      skills: String(request.query.skills || ""),
      completedMissionIds: submissions.map((submission) => submission.missionId),
    });

    response.json({ ok: true, ...recommendations });
  } catch (error) {
    next(error);
  }
});

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
