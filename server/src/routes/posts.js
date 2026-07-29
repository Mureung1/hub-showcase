import { Router } from "express";
import { ApiError } from "../utils/ApiError.js";
import { getNextPromotionStep } from "../services/promotionInterviewFlow.js";
import { getNextNoticeStep } from "../services/noticeInterviewFlow.js";
import { buildPromotionPost, buildNoticePost } from "../services/postContent.js";
import { createPost, listPosts, getPostById, updatePost } from "../services/postsRepo.js";
import { buildSuggestedPublishTime } from "../services/scheduleSuggestion.js";
import { getProfile } from "../services/brandProfileRepo.js";
import { findRecentMatchingPost } from "../services/naverBlogRss.js";

const router = Router();

router.post("/promotion/interview", (req, res) => {
  const { step, answer, purpose } = req.body ?? {};
  res.json(getNextPromotionStep(step, answer, purpose));
});

router.post("/promotion", async (req, res) => {
  const answers = req.body ?? {};
  const generated = await buildPromotionPost(answers);
  const post = await createPost({ type: "promotion", purpose: answers.purpose, ...generated });
  res.status(201).json(post);
});

router.post("/notice/interview", (req, res) => {
  const { step } = req.body ?? {};
  res.json(getNextNoticeStep(step));
});

router.post("/notice", async (req, res) => {
  const answers = req.body ?? {};
  const generated = await buildNoticePost(answers);
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

// 반자동 발행 후 "게시 완료" 확인용: 연동된 블로그의 RSS에서 이 글과 제목이 비슷한
// 최근 글을 찾아본다. 못 찾을 수 있는 휴리스틱이라 프론트가 항상 사용자 확인을
// 거치게 하고, 여기 응답만으로 status를 바꾸지 않는다(확정은 PATCH /:id로 별도 처리).
router.get("/:id/detect-published", async (req, res) => {
  const post = await getPostById(req.params.id);
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");

  const profile = await getProfile();
  if (!profile?.blogId) {
    return res.json({ found: false, reason: "NO_BLOG_ID" });
  }

  const match = await findRecentMatchingPost(profile.blogId, post.title);
  if (!match) {
    return res.json({ found: false, reason: "NOT_FOUND" });
  }

  res.json({ found: true, url: match.url });
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
