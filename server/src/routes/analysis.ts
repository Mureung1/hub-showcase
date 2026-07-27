import { Router } from "express";
import path from "path";
import { readJson, writeJson } from "../utils/jsonStore";
import { dataPath, ANALYZER_DIR } from "../utils/paths";
import { runAnalyzer } from "../utils/analyzer";
import { runJscpd } from "../utils/jscpd";
import { findRefactorTargets } from "../utils/refactorTargets";
import { generateAnalysisReport } from "../utils/geminiReport";
import { saveDocument, getDocument } from "../utils/documents";

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

interface AnalysisStats {
  dependencyCount: number;
  duplicateCount: number;
  refactorTargetCount: number;
}

interface StoredProject {
  repo_url: string;
  branch: string;
  analysis_preset: string;
  connected_at: string;
  status: "queued" | "completed" | "failed";
  stats?: AnalysisStats;
}

async function readProjectSafely(): Promise<StoredProject | null> {
  try {
    return await readJson<StoredProject>(PROJECT_FILE);
  } catch {
    return null;
  }
}

router.post("/start", async (req, res) => {
  const { repoId, branch, preset } = req.body as StartAnalysisRequest;

  if (!repoId || !branch || !preset) {
    return res.status(400).json({ error: "repoId, branch, and preset are all required." });
  }

  let project: StoredProject = {
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

    const stats: AnalysisStats = {
      dependencyCount: classes.reduce((sum, c) => sum + c.baseTypes.length + c.referencedTypes.length, 0),
      duplicateCount: duplicates.length,
      refactorTargetCount: refactorTargets.length,
    };
    project = { ...project, status: "completed", stats };
    await writeJson(PROJECT_FILE, project);

    res.json({ ...project, classes, duplicates, refactorTargets, report });
  } catch (err) {
    project = { ...project, status: "failed" };
    await writeJson(PROJECT_FILE, project);

    res.status(500).json({
      ...project,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get("/project", async (_req, res) => {
  const project = await readProjectSafely();
  if (!project) {
    return res.status(404).json({ error: "No project connected yet." });
  }
  res.json({ repo_url: project.repo_url, branch: project.branch });
});

router.get("/report", async (_req, res) => {
  const project = await readProjectSafely();
  if (!project || project.status !== "completed" || !project.stats) {
    return res.status(404).json({ error: "No completed analysis report available." });
  }

  const doc = await getDocument(ANALYSIS_STEP_ID);
  if (!doc) {
    return res.status(404).json({ error: "No completed analysis report available." });
  }

  res.json({ stats: project.stats, report: doc.content, updated_at: doc.updated_at });
});

export default router;
