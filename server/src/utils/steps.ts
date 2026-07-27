import { readJson } from "./jsonStore";
import { dataPath } from "./paths";

export const STEPS_FILE = dataPath("steps.json");

export interface Step {
  id: number;
  name: string;
  status: "pending" | "active" | "done";
  progress_pct: number;
  agent_name: string;
}

export async function getSteps(): Promise<Step[]> {
  return readJson<Step[]>(STEPS_FILE);
}

export async function getStep(id: number): Promise<Step | null> {
  const steps = await getSteps();
  return steps.find((s) => s.id === id) ?? null;
}
