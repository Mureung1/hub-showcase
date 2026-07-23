import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getLatestFeedback,
  saveLatestFeedback,
} from "../services/feedbackService.js";

export const feedbackRouter = Router();

feedbackRouter.use(requireAuth);

feedbackRouter.get("/latest", async (request, response, next) => {
  try {
    const result = await getLatestFeedback(request.user.id);
    response.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/latest", async (request, response, next) => {
  try {
    const result = await saveLatestFeedback(request.user.id);
    response.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
