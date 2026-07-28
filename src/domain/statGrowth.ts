export type StatKey =
  | "diligence"
  | "persistence"
  | "creativity"
  | "knowledge"
  | "strength"
  | "agility"
  | "stamina"
  | "charm";

export interface StatDelta {
  stat: StatKey;
  amount: number;
}

export type GrowthQuestType = "time" | "quantity" | "action" | "recovery";
export type GrowthEventType = "quest_completed" | "quest_failed" | "recovery_completed";
export type GrowthDifficulty = "easy" | "normal" | "hard";

export interface ManagerStatEvaluation {
  difficulty: GrowthDifficulty;
  statBudget: number;
  primaryStats: StatKey[];
  statDeltas: StatDelta[];
  reason: string;
}

export interface RuleFallbackStatEvaluationInput {
  questType: GrowthQuestType;
  eventType: GrowthEventType;
  difficulty: GrowthDifficulty;
}

export const statBudgetByDifficulty: Record<GrowthDifficulty, number> = {
  easy: 3,
  normal: 7,
  hard: 15,
};

const statKeys = ["diligence", "persistence", "creativity", "knowledge", "strength", "agility", "stamina", "charm"] as const satisfies readonly StatKey[];
const difficulties = ["easy", "normal", "hard"] as const satisfies readonly GrowthDifficulty[];

const questStatProfiles: Record<GrowthQuestType, { primary: StatKey; secondary: StatKey; reason: string }> = {
  time: { primary: "diligence", secondary: "stamina", reason: "시간형 퀘스트라 성실성과 체력 중심으로 분배한다." },
  quantity: { primary: "persistence", secondary: "knowledge", reason: "수량형 퀘스트라 끈기와 지식 중심으로 분배한다." },
  action: { primary: "strength", secondary: "agility", reason: "행동형 퀘스트라 힘과 민첩함 중심으로 분배한다." },
  recovery: { primary: "persistence", secondary: "diligence", reason: "복구 퀘스트라 끈기와 성실성 중심으로 재평가한다." },
};

export function getQuestStatDeltas(questType: GrowthQuestType, eventType: GrowthEventType, difficulty: GrowthDifficulty = "normal"): StatDelta[] {
  return createRuleFallbackStatEvaluation({ questType, eventType, difficulty }).statDeltas;
}

export function createRuleFallbackStatEvaluation(input: RuleFallbackStatEvaluationInput): ManagerStatEvaluation {
  if (input.eventType === "quest_failed") {
    return {
      difficulty: input.difficulty,
      statBudget: 0,
      primaryStats: [],
      statDeltas: [],
      reason: "실패 이벤트는 능력치를 증가시키지 않는다.",
    };
  }

  const profile = questStatProfiles[input.eventType === "recovery_completed" ? "recovery" : input.questType];
  const statBudget = statBudgetByDifficulty[input.difficulty];
  const primaryAmount = Math.floor(statBudget * 0.8);
  const secondaryAmount = statBudget - primaryAmount;

  return {
    difficulty: input.difficulty,
    statBudget,
    primaryStats: [profile.primary],
    statDeltas: [
      { stat: profile.primary, amount: primaryAmount },
      { stat: profile.secondary, amount: secondaryAmount },
    ],
    reason: profile.reason,
  };
}

export function normalizeManagerStatEvaluation(input: unknown, fallback: ManagerStatEvaluation): ManagerStatEvaluation {
  if (!isRecord(input) || !isDifficulty(input.difficulty)) return fallback;

  const expectedBudget = statBudgetByDifficulty[input.difficulty];
  if (input.statBudget !== expectedBudget) return fallback;
  if (!Array.isArray(input.primaryStats) || !input.primaryStats.every(isStatKey)) return fallback;
  if (!Array.isArray(input.statDeltas)) return fallback;
  if (typeof input.reason !== "string" || !input.reason.trim()) return fallback;

  const statDeltas = input.statDeltas.flatMap(normalizeStatDelta);
  if (statDeltas.length !== input.statDeltas.length) return fallback;
  if (!isValidStatDistribution(statDeltas, input.primaryStats, expectedBudget)) return fallback;

  return {
    difficulty: input.difficulty,
    statBudget: expectedBudget,
    primaryStats: input.primaryStats,
    statDeltas,
    reason: input.reason.trim(),
  };
}

function normalizeStatDelta(input: unknown): StatDelta[] {
  if (!isRecord(input) || !isStatKey(input.stat) || typeof input.amount !== "number" || !Number.isInteger(input.amount) || input.amount < 1) return [];
  return [{ stat: input.stat, amount: input.amount }];
}

function isValidStatDistribution(statDeltas: StatDelta[], primaryStats: StatKey[], budget: number) {
  const total = statDeltas.reduce((sum, delta) => sum + delta.amount, 0);
  if (total !== budget) return false;

  const maxSingleStat = Math.floor(budget * 0.8);
  if (statDeltas.some((delta) => delta.amount > maxSingleStat)) return false;

  const primaryTotal = statDeltas.filter((delta) => primaryStats.includes(delta.stat)).reduce((sum, delta) => sum + delta.amount, 0);
  return primaryTotal >= Math.ceil(budget * 0.6);
}

function isDifficulty(value: unknown): value is GrowthDifficulty {
  return difficulties.includes(value as GrowthDifficulty);
}

function isStatKey(value: unknown): value is StatKey {
  return statKeys.includes(value as StatKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
