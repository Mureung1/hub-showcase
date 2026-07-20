import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getLatestSubmission,
  getMySubmissions,
  saveSubmission,
} from "../services/submissionService.js";

export const submissionRouter = Router();

submissionRouter.use(requireAuth);

submissionRouter.get("/me", async (request, response, next) => {
  try {
    const submissions = await getMySubmissions(request.user.id);
    response.json({ ok: true, submissions });
  } catch (error) {
    next(error);
  }
});

submissionRouter.get("/latest", async (request, response, next) => {
  try {
    const submission = await getLatestSubmission(request.user.id);
    response.json({ ok: true, submission });
  } catch (error) {
    next(error);
  }
});

submissionRouter.post("/", async (request, response, next) => {
  try {
    const submission = await saveSubmission({
      userId: request.user.id,
      submission: request.body,
    });

    response.status(201).json({ ok: true, submission });
  } catch (error) {
    next(error);
  }
});
