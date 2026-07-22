import { Router } from "express";
import { supabase } from "../db/supabaseClient.js";

const router = Router();

function daysUntil(dateStr) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const deadline = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((deadline - today) / 86400000);
}

function toListing(row) {
  const dDay = daysUntil(row.deadline_date);
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
        desc: row.description,
    dDay,
    eligibleRegions: row.eligible_regions ? JSON.parse(row.eligible_regions) : undefined,
    eligibleGrades: row.eligible_grades ? JSON.parse(row.eligible_grades) : undefined,
    interest: row.interest || undefined,
    teamBoardCount: row.team_board_count || undefined,
    sourceUrl: row.source_url || undefined,
  };
}

router.get("/categories", async (req, res) => {
  const { data, error } = await supabase.from("categories").select("id, label, description");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((c) => ({ id: c.id, label: c.label, desc: c.description })));
});

router.get("/", async (req, res) => {
  const { categoryId } = req.query;
  let query = supabase.from("listings").select("*");
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toListing));
});

router.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("listings").select("*").eq("id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "not found" });
  res.json(toListing(data));
});

export default router;
