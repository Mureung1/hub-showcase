import { readFile } from "fs/promises";
import { Router } from "express";
import { analyzeEssayQuestion } from "../services/essayAnalysis.js";
import { generateDrafts } from "../services/draftGeneration.js";

const router = Router();

router.post("/:id/draft", async (req, res) => {
  const { profile } = req.body;
  if (!profile) {
    res.status(400).json({ error: "profile은 필수입니다." });
    return;
  }

  try {
    const postingsUrl = new URL("../../data/postings.json", import.meta.url);
    const postings = JSON.parse(await readFile(postingsUrl, "utf-8"));
    const postingId = Number(req.params.id);
    const posting = postings.find((p) => p.id === postingId);

    if (!posting) {
      res.status(404).json({ error: `공고를 찾을 수 없습니다: ${postingId}` });
      return;
    }

    const essayQuestions = posting.essayQuestions.map((q) => ({
      ...q,
      analysis: analyzeEssayQuestion(q.question, profile),
    }));

    const drafts = await generateDrafts(profile, posting, essayQuestions);

    res.status(200).json({
      essayQuestions: essayQuestions.map((q, index) => ({ ...q, draft: drafts[index] })),
    });
  } catch (error) {
    console.error("POST /api/postings/:id/draft failed:", error);
    res.status(500).json({ error: "요청 처리 중 오류가 발생했습니다." });
  }
});

export default router;
