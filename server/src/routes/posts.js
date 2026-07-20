import { Router } from "express";
import { ApiError } from "../utils/ApiError.js";
import { getNextPromotionStep } from "../services/promotionInterviewFlow.js";
import { getNextNoticeStep } from "../services/noticeInterviewFlow.js";
import { buildPromotionPost, buildNoticePost } from "../services/postContent.js";
import { createPost, listPosts, getPostById, updatePost } from "../services/postsRepo.js";
import { buildSuggestedPublishTime } from "../services/scheduleSuggestion.js";
import { getProfile } from "../services/brandProfileRepo.js";

const router = Router();

router.post("/promotion/interview", (req, res) => {
  const { step, answer, purpose } = req.body ?? {};
  res.json(getNextPromotionStep(step, answer, purpose));
});

router.post("/promotion", async (req, res) => {
  const answers = req.body ?? {};
  const generated = buildPromotionPost(answers);
  const post = await createPost({ type: "promotion", purpose: answers.purpose, ...generated });
  res.status(201).json(post);
});

router.post("/notice/interview", (req, res) => {
  const { step } = req.body ?? {};
  res.json(getNextNoticeStep(step));
});

router.post("/notice", async (req, res) => {
  const answers = req.body ?? {};
  const generated = buildNoticePost(answers);
  const post = await createPost({ type: "notice", ...generated });
  res.status(201).json(post);
});

router.get("/", async (req, res) => {
  const { status } = req.query;
  res.json(await listPosts({ status }));
});

router.get("/:id", async (req, res) => {
  const post = await getPostById(req.params.id);
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  res.json(post);
});

router.patch("/:id", async (req, res) => {
  const updated = await updatePost(req.params.id, req.body ?? {});
  if (!updated) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  res.json(updated);
});

router.get("/:id/suggested-time", async (req, res) => {
  const post = await getPostById(req.params.id);
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  const profile = await getProfile();
  res.json(buildSuggestedPublishTime(profile));
});

router.post("/:id/schedule", async (req, res) => {
  const { scheduledAt } = req.body ?? {};
  if (!scheduledAt) throw new ApiError(400, "MISSING_FIELDS", "scheduledAt이 필요합니다.");
  const updated = await updatePost(req.params.id, { status: "scheduled", scheduledAt });
  if (!updated) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  res.json(updated);
});

router.delete("/:id/schedule", async (req, res) => {
  const updated = await updatePost(req.params.id, { status: "draft", scheduledAt: null });
  if (!updated) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  res.json(updated);
});

export default router;
