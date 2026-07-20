import { Router } from "express";
import { writeJson } from "../utils/jsonStore";
import { dataPath } from "../utils/paths";

const router = Router();

const PROJECT_FILE = dataPath("project.json");

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
  res.json(project);
});

export default router;
