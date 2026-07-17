import { Router } from "express";
import { ApiError } from "../utils/ApiError.js";
import { getNextPromotionStep } from "../services/promotionInterviewFlow.js";
import { getNextNoticeStep } from "../services/noticeInterviewFlow.js";
import { buildPromotionPost, buildNoticePost } from "../services/postContent.js";
import { createPost, listPosts, getPostById, updatePost } from "../services/postsRepo.js";

const router = Router();

router.post("/promotion/interview", (req, res) => {
  const { step, answer, purpose } = req.body ?? {};
  res.json(getNextPromotionStep(step, answer, purpose));
});

router.post("/promotion", (req, res) => {
  const answers = req.body ?? {};
  const generated = buildPromotionPost(answers);
  const post = createPost({ type: "promotion", purpose: answers.purpose, ...generated });
  res.status(201).json(post);
});

router.post("/notice/interview", (req, res) => {
  const { step } = req.body ?? {};
  res.json(getNextNoticeStep(step));
});

router.post("/notice", (req, res) => {
  const answers = req.body ?? {};
  const generated = buildNoticePost(answers);
  const post = createPost({ type: "notice", ...generated });
  res.status(201).json(post);
});

router.get("/", (req, res) => {
  const { status } = req.query;
  res.json(listPosts({ status }));
});

router.get("/:id", (req, res) => {
  const post = getPostById(req.params.id);
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  res.json(post);
});

router.patch("/:id", (req, res) => {
  const updated = updatePost(req.params.id, req.body ?? {});
  if (!updated) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  res.json(updated);
});

export default router;
