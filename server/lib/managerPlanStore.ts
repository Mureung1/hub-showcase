import type { ManagerGoalPlan, ManagerPlanRebalance } from "../contracts/managerLlm.js";

export interface SaveManagerGoalPlanInput {
  goal: string;
  category: string;
  source: "llm" | "rule_fallback";
  fallbackReason?: string;
  promptVersion: string;
  plan: ManagerGoalPlan;
}

export interface SaveManagerPlanRevisionInput {
  planId?: string | null;
  goal: string;
  triggerEventId?: string | null;
  source: "llm" | "rule_fallback";
  fallbackReason?: string;
  promptVersion: string;
  rebalance: ManagerPlanRebalance;
}

export interface ManagerPlanStore {
  saveGoalPlan(input: SaveManagerGoalPlanInput): Promise<{ id: string; createdAt: string }>;
  savePlanRevision(input: SaveManagerPlanRevisionInput): Promise<{ id: string; createdAt: string }>;
}

export function createMemoryManagerPlanStore(): ManagerPlanStore {
  const plans: SaveManagerGoalPlanInput[] = [];
  const revisions: SaveManagerPlanRevisionInput[] = [];

  return {
    async saveGoalPlan(input) {
      plans.unshift(input);
      return { id: `plan-${plans.length}`, createdAt: new Date().toISOString() };
    },
    async savePlanRevision(input) {
      revisions.unshift(input);
      return { id: `revision-${revisions.length}`, createdAt: new Date().toISOString() };
    },
  };
}
