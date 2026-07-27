import { Router } from "express";
import { writeJson } from "../utils/jsonStore";
import { getDocument } from "../utils/documents";
import { calculateChecklistProgress } from "../utils/checklist";
import { getSteps, STEPS_FILE, type Step } from "../utils/steps";

const router = Router();

async function withFreshProgress(steps: Step[]): Promise<Step[]> {
  return Promise.all(
    steps.map(async (step) => {
      const doc = await getDocument(step.id);
      const progress_pct = doc ? calculateChecklistProgress(doc.content) : 0;
      return { ...step, progress_pct };
    })
  );
}

router.get("/", async (_req, res) => {
  res.json(await withFreshProgress(await getSteps()));
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
