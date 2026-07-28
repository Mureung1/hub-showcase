import { Router } from "express";
import { writeJson } from "../utils/jsonStore";
import { getDocument } from "../utils/documents";
import { calculateChecklistProgress } from "../utils/checklist";
import { getFileChanges } from "../utils/fileChanges";
import { FILE_AGENT_PROMPTS } from "../utils/fileAgentPrompts";
import { getSteps, STEPS_FILE, type Step } from "../utils/steps";

const router = Router();

// Steps whose Agent produces a file-change array (Code Generation/Refactoring)
// track progress as "approved files / total proposed files" instead of the
// checklist-based calc every other Step uses — driven by which registry the
// Step's agent_name is in, not by a hardcoded step id.
async function withFreshProgress(steps: Step[]): Promise<Step[]> {
  return Promise.all(
    steps.map(async (step) => {
      if (step.agent_name in FILE_AGENT_PROMPTS) {
        const files = await getFileChanges(step.id);
        const progress_pct =
          files.length === 0 ? 0 : Math.round((files.filter((f) => f.approved).length / files.length) * 100);
        return { ...step, progress_pct };
      }

      const doc = await getDocument(step.id);
      const progress_pct = doc ? calculateChecklistProgress(doc.content) : 0;
      return { ...step, progress_pct };
    })
  );
}

router.get("/", async (_req, res) => {
  res.json(await withFreshProgress(await getSteps()));
});

router.get("/:stepId/file-changes", async (req, res) => {
  res.json(await getFileChanges(req.params.stepId));
});

// Local status transition only — no GitHub commit here (that's a later sprint).
router.post("/:stepId/approve", async (req, res) => {
  const stepId = Number(req.params.stepId);
  if (!Number.isInteger(stepId)) {
    return res.status(400).json({ error: "Invalid step id." });
  }

  const steps = await getSteps();
  if (!steps.some((s) => s.id === stepId)) {
    return res.status(404).json({ error: "Step not found." });
  }

  const updated = steps.map((s): Step => {
    if (s.id === stepId) return { ...s, status: "done" };
    if (s.id === stepId + 1) return { ...s, status: "active" };
    return s;
  });
  await writeJson(STEPS_FILE, updated);

  res.json(await withFreshProgress(updated));
});

export default router;
