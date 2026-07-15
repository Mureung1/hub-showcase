import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

router.get("/health", (req, res) => {
  db.prepare("SELECT 1").get();
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
