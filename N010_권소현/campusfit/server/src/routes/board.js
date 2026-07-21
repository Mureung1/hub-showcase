import { Router } from "express";
import { supabase } from "../db/supabaseClient.js";
const router = Router();

function daysUntil(dateStr) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const deadline = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((deadline - today) / 86400000);
}

async function toPost(row) {
  const { data: listing } = await supabase
    .from("listings")
    .select("deadline_date")
    .eq("id", row.listing_id)
    .single();
  const dDay = listing ? daysUntil(listing.deadline_date) : undefined;
  const { data: comments } = await supabase
    .from("comments")
    .select("who, text")
    .eq("post_id", row.id)
    .order("id");
  return {
    id: row.id,
    listingId: row.listing_id,
    title: row.title,
    meta: row.meta,
    dDay,
    body: row.body,
    comments: comments || [],
  };
}

router.get("/", async (req, res) => {
  const { listingId } = req.query;
  let query = supabase.from("board_posts").select("*");
  if (listingId) query = query.eq("listing_id", listingId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(await Promise.all(data.map(toPost)));
});

router.get("/:id", async (req, res) => {
  const { data: row, error } = await supabase
    .from("board_posts")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error || !row) return res.status(404).json({ error: "not found" });
  res.json(await toPost(row));
});

router.post("/", async (req, res) => {
  const { listingId, title, meta, body } = req.body;
  if (!listingId || !title || !meta || !body) {
    return res.status(400).json({ error: "listingId, title, meta, body는 필수입니다" });
  }
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .single();
  if (!listing) return res.status(400).json({ error: "존재하지 않는 listingId입니다" });

  const id = `p-${Date.now()}`;
  const { error } = await supabase
    .from("board_posts")
    .insert({ id, listing_id: listingId, title, meta, body });
  if (error) return res.status(500).json({ error: error.message });

  const { data: row } = await supabase.from("board_posts").select("*").eq("id", id).single();
  res.status(201).json(await toPost(row));
});

router.post("/:id/comments", async (req, res) => {
  const { data: post } = await supabase
    .from("board_posts")
    .select("id")
    .eq("id", req.params.id)
    .single();
  if (!post) return res.status(404).json({ error: "not found" });
  const { who, text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const comment = { who: who || "익명", text };
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: req.params.id, who: comment.who, text: comment.text });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(comment);
});

export default router;
