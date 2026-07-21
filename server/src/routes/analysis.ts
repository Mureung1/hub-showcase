import { Router } from "express";
import path from "path";
import { writeJson } from "../utils/jsonStore";
import { dataPath, ANALYZER_DIR } from "../utils/paths";
import { runAnalyzer, type AnalyzedClass } from "../utils/analyzer";

const router = Router();

const PROJECT_FILE = dataPath("project.json");
// We don't clone the target GitHub repo locally yet (that's still ahead of us), so
// there's no real checkout to point the analyzer at — the bundled sample fixtures
// stand in for it until repo cloning exists.
const ANALYZER_TEST_TARGET = path.join(ANALYZER_DIR, "samples");

interface StartAnalysisRequest {
  repoId?: string;
  branch?: string;
  preset?: string;
}

interface StoredProject {
  repo_url: string;
  branch: string;
  analysis_preset: string;
  connected_at: string;
  status: "queued";
}

router.post("/start", async (req, res) => {
  const { repoId, branch, preset } = req.body as StartAnalysisRequest;

  if (!repoId || !branch || !preset) {
    return res.status(400).json({ error: "repoId, branch, and preset are all required." });
  }

  const project: StoredProject = {
    repo_url: `https://github.com/${repoId}`,
    branch,
    analysis_preset: preset,
    connected_at: new Date().toISOString(),
    status: "queued",
  };

  await writeJson(PROJECT_FILE, project);

  let analyzerCheck: { ok: true; classes: AnalyzedClass[] } | { ok: false; error: string };
  try {
    const result = await runAnalyzer(ANALYZER_TEST_TARGET);
    analyzerCheck = { ok: true, classes: result.classes };
  } catch (err) {
    analyzerCheck = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  res.json({ ...project, analyzerCheck });
});

export default router;
