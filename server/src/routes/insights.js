import { Router } from "express";
import { getHealthScore, getOpportunities } from "../services/insightsService.js";

const router = Router();

router.get("/health-score", async (req, res) => {
  res.json(await getHealthScore());
});

router.get("/opportunities", async (req, res) => {
  res.json(await getOpportunities());
});

export default router;
