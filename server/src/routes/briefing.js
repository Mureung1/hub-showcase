import { Router } from "express";
import { getTodayBriefing } from "../services/briefingService.js";

const router = Router();

router.get("/today", async (req, res) => {
  res.json(await getTodayBriefing());
});

export default router;
