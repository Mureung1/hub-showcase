import { readFile } from "fs/promises";
import { Router } from "express";
import { supabase } from "../lib/supabaseClient.js";
import { scoreAndRank, parseNumber } from "../services/matching.js";
import { generateReasons } from "../services/claude.js";

const router = Router();

const REQUIRED_FIELDS = ["university", "grade", "major", "earnedCredits", "gpa"];

router.post("/", async (req, res) => {
  const profile = req.body;

  const missingFields = REQUIRED_FIELDS.filter((field) => !profile[field]);
  if (missingFields.length > 0) {
    res.status(400).json({ error: `필수 항목 누락: ${missingFields.join(", ")}` });
    return;
  }

  try {
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        university: profile.university,
        grade: profile.grade,
        major: profile.major,
        double_major: profile.doubleMajor ?? null,
        minor: profile.minor ?? null,
        earned_credits: parseNumber(profile.earnedCredits),
        gpa: parseNumber(profile.gpa),
        certificates: profile.certificates ?? [],
        experience: profile.experience ?? null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const postingsUrl = new URL("../../data/postings.json", import.meta.url);
    const postings = JSON.parse(await readFile(postingsUrl, "utf-8"));
    const ranked = scoreAndRank(profile, postings);
    const reasonDetails = await generateReasons(profile, ranked);

    const recommendations = ranked.map(({ keywords: _keywords, ...posting }, index) => ({
      ...posting,
      reasonDetail: reasonDetails[index],
    }));

    res.status(201).json({ profileId: inserted.id, recommendations });
  } catch (error) {
    console.error("POST /api/profiles failed:", error);
    res.status(500).json({ error: "요청 처리 중 오류가 발생했습니다." });
  }
});

export default router;
