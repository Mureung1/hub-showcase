import { Router } from "express";

const router = Router();

router.get("/check", (req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
