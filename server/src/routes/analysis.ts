import { Router } from "express";
import path from "path";
import { writeJson } from "../utils/jsonStore";
import { dataPath, ANALYZER_DIR } from "../utils/paths";
import { runAnalyzer } from "../utils/analyzer";
import { runJscpd } from "../utils/jscpd";
import { findRefactorTargets } from "../utils/refactorTargets";
import { generateAnalysisReport } from "../utils/geminiReport";
import { saveDocument } from "../utils/documents";

const router = Router();

const PROJECT_FILE = dataPath("project.json");
// We don't clone the target GitHub repo locally yet (that's still ahead of us), so
// there's no real checkout to point the analyzer/jscpd at — the bundled sample
// fixtures stand in for it until repo cloning exists.
const ANALYSIS_TARGET = path.join(ANALYZER_DIR, "samples");
const ANALYSIS_STEP_ID = 0; // 00_Analysis_Report.md sits ahead of the 9-step workflow proper.

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

  try {
    const { classes } = await runAnalyzer(ANALYSIS_TARGET);
    const { duplicates } = await runJscpd(ANALYSIS_TARGET);
    const refactorTargets = findRefactorTargets(classes);
    const report = await generateAnalysisReport({ classes, duplicates, refactorTargets });

    await saveDocument(ANALYSIS_STEP_ID, "docs/00_Analysis_Report.md", report);

    res.json({ ...project, classes, duplicates, refactorTargets, report });
  } catch (err) {
    res.status(500).json({
      ...project,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
