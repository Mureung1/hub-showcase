import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getLatestPortfolioDraft,
  saveLatestPortfolioDraft,
} from "../services/portfolioService.js";

export const portfolioRouter = Router();

portfolioRouter.use(requireAuth);

portfolioRouter.get("/latest", async (request, response, next) => {
  try {
    const result = await getLatestPortfolioDraft(request.user.id);
    response.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

portfolioRouter.post("/latest", async (request, response, next) => {
  try {
    const result = await saveLatestPortfolioDraft(request.user.id);
    response.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
