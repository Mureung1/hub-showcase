import { readFile } from "fs/promises";
import { Router } from "express";
import { analyzeEssayQuestion } from "../services/essayAnalysis.js";
import { generateDrafts } from "../services/draftGeneration.js";
import { supabase } from "../lib/supabaseClient.js";

const router = Router();

async function loadPosting(postingId) {
  const postingsUrl = new URL("../../data/postings.json", import.meta.url);
  const postings = JSON.parse(await readFile(postingsUrl, "utf-8"));
  return postings.find((p) => p.id === postingId);
}

function toProfile(row) {
  return {
    major: row.major,
    doubleMajor: row.double_major,
    minor: row.minor,
    certificates: row.certificates,
    experience: row.experience,
  };
}

router.post("/:id/draft", async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) {
    res.status(400).json({ error: "profileId는 필수입니다." });
    return;
  }

  try {
    const postingId = Number(req.params.id);
    const posting = await loadPosting(postingId);

    if (!posting) {
      res.status(404).json({ error: `공고를 찾을 수 없습니다: ${postingId}` });
      return;
    }

    const [{ data: profileRow, error: profileError }, { data: savedDraft, error: selectError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
      supabase.from("drafts").select("answers").eq("profile_id", profileId).eq("posting_id", postingId).maybeSingle(),
    ]);

    if (profileError) {
      throw profileError;
    }
    if (selectError) {
      throw selectError;
    }

    if (!profileRow) {
      res.status(404).json({ error: `프로필을 찾을 수 없습니다: ${profileId}` });
      return;
    }

    const profile = toProfile(profileRow);

    const essayQuestions = posting.essayQuestions.map((q) => ({
      ...q,
      analysis: analyzeEssayQuestion(q.question, profile),
    }));

    if (savedDraft) {
      res.status(200).json({
        isSaved: true,
        essayQuestions: essayQuestions.map((q, index) => ({ ...q, draft: savedDraft.answers[index] })),
      });
      return;
    }

    const drafts = await generateDrafts(profile, posting, essayQuestions);

    res.status(200).json({
      isSaved: false,
      essayQuestions: essayQuestions.map((q, index) => ({ ...q, draft: drafts[index] })),
    });
  } catch (error) {
    console.error("POST /api/postings/:id/draft failed:", error);
    res.status(500).json({ error: "요청 처리 중 오류가 발생했습니다." });
  }
});

router.post("/:id/draft/save", async (req, res) => {
  const { profileId, answers } = req.body;
  if (!profileId || !Array.isArray(answers)) {
    res.status(400).json({ error: "profileId와 answers는 필수입니다." });
    return;
  }

  try {
    const postingId = Number(req.params.id);
    const { error } = await supabase.from("drafts").upsert(
      {
        profile_id: profileId,
        posting_id: postingId,
        answers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,posting_id" },
    );

    if (error) {
      throw error;
    }

    res.status(200).json({ saved: true });
  } catch (error) {
    console.error("POST /api/postings/:id/draft/save failed:", error);
    res.status(500).json({ error: "저장 중 오류가 발생했습니다." });
  }
});

export default router;
