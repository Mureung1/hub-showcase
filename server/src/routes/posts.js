import { Router } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError.js";
import { getNextPromotionStep } from "../services/promotionInterviewFlow.js";
import { getNextNoticeStep } from "../services/noticeInterviewFlow.js";
import { buildPromotionPost, buildNoticePost } from "../services/postContent.js";
import { createPost, listPosts, getPostById, updatePost, deletePost } from "../services/postsRepo.js";
import { buildSuggestedPublishTime } from "../services/scheduleSuggestion.js";
import { getProfile } from "../services/brandProfileRepo.js";
import { findRecentMatchingPost, checkPostStillPublished } from "../services/naverBlogRss.js";
import { uploadPostImage } from "../services/imageStorage.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// 네이버 블로그에 이미 반자동 발행된 뒤에는 우리 DB와 실제 네이버 게시 상태가
// 동기화되지 않는다(RSS로 "게시 확인"만 함, 삭제 감지는 안 함). 사용자가 네이버
// 쪽에서 글을 지운 경우 이 API로 우리 쪽 기록도 직접 지울 수 있게 한다.
router.delete("/:id", async (req, res) => {
  const deleted = await deletePost(req.params.id);
  if (!deleted) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  res.status(204).send();
});

// 인터뷰에서 업로드한 사진을 Supabase Storage에 저장하고 thumbnailUrl로 반영한다.
// 사진을 보고 배치를 추천하는 AI 기능은 비전 모델이 필요해 범위 밖(이후 과제)이고,
// 여기서는 저장 + 노출까지만 한다.
router.post("/:id/images", upload.single("image"), async (req, res) => {
  const post = await getPostById(req.params.id);
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  if (!req.file) throw new ApiError(400, "MISSING_FIELDS", "image 파일이 필요합니다.");

  const thumbnailUrl = await uploadPostImage(post.id, req.file);
  const updated = await updatePost(post.id, {
    thumbnailUrl,
    images: [...(post.images ?? []), thumbnailUrl],
  });
  res.status(201).json(updated);
});

// 반자동 발행 이후 네이버 쪽에서 글이 삭제됐는지 서버가 직접 확인해본다. RSS는
// 최근 항목만 보여줘서 삭제 여부를 구분 못 하므로 publishedUrl을 직접 요청한다 —
// 확실한 판별이 아닌 휴리스틱이라 프론트가 항상 사용자 확인을 거치게 한다.
router.get("/:id/check-deleted", async (req, res) => {
  const post = await getPostById(req.params.id);
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
  if (!post.publishedUrl) {
    return res.json({ result: "no_url" });
  }

  const stillPublished = await checkPostStillPublished(post.publishedUrl);
  const result = stillPublished === true ? "exists" : stillPublished === false ? "deleted" : "unknown";
  res.json({ result });
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
