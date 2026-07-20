import { Router } from "express";
import { ApiError } from "../utils/ApiError.js";
import { getNextBrandProfileStep } from "../services/brandProfileInterviewFlow.js";
import { buildBrandProfileSummary } from "../services/brandProfileContent.js";
import { createProfile, getProfile, updateProfile } from "../services/brandProfileRepo.js";

const router = Router();

router.post("/interview", (req, res) => {
  const { step } = req.body ?? {};
  res.json(getNextBrandProfileStep(step));
});

router.get("/", async (req, res) => {
  const profile = await getProfile();
  if (!profile) throw new ApiError(404, "BRAND_PROFILE_NOT_FOUND", "브랜드 프로필이 아직 생성되지 않았습니다.");
  res.json(profile);
});

router.post("/", async (req, res) => {
  const answers = req.body ?? {};
  const { summary, keywords } = buildBrandProfileSummary(answers);
  const profile = await createProfile({ ...answers, summary, keywords });
  res.status(201).json(profile);
});

router.patch("/", async (req, res) => {
  const updated = await updateProfile(req.body ?? {});
  if (!updated) throw new ApiError(404, "BRAND_PROFILE_NOT_FOUND", "브랜드 프로필이 아직 생성되지 않았습니다.");
  res.json(updated);
});

export default router;
