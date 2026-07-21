import { Router } from "express";
import { supabase } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

router.get("/health", async (req, res) => {
  const { error } = await supabase.from("posts").select("id").limit(1);
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
