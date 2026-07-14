import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getLatestAnalysis,
  runCareerAnalysis,
} from "../services/analysisService.js";

export const analysisRouter = Router();

analysisRouter.use(requireAuth);

analysisRouter.get("/me", async (request, response, next) => {
  try {
    const analysis = await getLatestAnalysis(request.user.id);
    response.json({ ok: true, analysis });
  } catch (error) {
    next(error);
  }
});

analysisRouter.post("/", async (request, response, next) => {
  try {
    const analysis = await runCareerAnalysis(request.user);
    response.json({ ok: true, analysis });
  } catch (error) {
    next(error);
  }
});
