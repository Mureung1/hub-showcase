import type { PetBehaviorState, PetBehaviorStyle } from "./petBehaviorStateMachine";

export interface ManagerBehaviorBias {
  state: PetBehaviorState;
  weightDelta: number;
  reason: string;
}

export interface ManagerBehaviorIntent {
  behaviorStyle: PetBehaviorStyle;
  tone: "calm" | "friendly" | "firm";
  line: string;
  suggestedBehaviorBias: ManagerBehaviorBias[];
}

export const defaultManagerBehaviorIntent: ManagerBehaviorIntent = {
  behaviorStyle: "balanced",
  tone: "friendly",
  line: "",
  suggestedBehaviorBias: [],
};

const behaviorStates = [
  "idle",
  "wander",
  "approach_ladder",
  "climb_ladder",
  "approach_platform",
  "jump_to_platform",
  "hide_behind_window",
  "hang_on_window",
  "escape_window",
  "rest",
] as const satisfies readonly PetBehaviorState[];

const behaviorStyles = ["balanced", "adventurous", "shy"] as const satisfies readonly PetBehaviorStyle[];
const tones = ["calm", "friendly", "firm"] as const satisfies readonly ManagerBehaviorIntent["tone"][];

export function normalizeManagerBehaviorIntent(input: unknown, fallback: ManagerBehaviorIntent = defaultManagerBehaviorIntent): ManagerBehaviorIntent {
  if (!isRecord(input)) return fallback;
  if (!isBehaviorStyle(input.behaviorStyle)) return fallback;

  return {
    behaviorStyle: input.behaviorStyle,
    tone: isTone(input.tone) ? input.tone : fallback.tone,
    line: typeof input.line === "string" ? input.line : fallback.line,
    suggestedBehaviorBias: Array.isArray(input.suggestedBehaviorBias) ? input.suggestedBehaviorBias.flatMap(normalizeBehaviorBias) : [],
  };
}

function normalizeBehaviorBias(input: unknown): ManagerBehaviorBias[] {
  if (!isRecord(input) || !isBehaviorState(input.state) || typeof input.weightDelta !== "number") return [];

  return [
    {
      state: input.state,
      weightDelta: clampWeightDelta(input.weightDelta),
      reason: typeof input.reason === "string" ? input.reason : "llm_bias",
    },
  ];
}

function clampWeightDelta(value: number): number {
  return Math.max(-2, Math.min(2, Math.trunc(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBehaviorStyle(value: unknown): value is PetBehaviorStyle {
  return behaviorStyles.includes(value as PetBehaviorStyle);
}

function isBehaviorState(value: unknown): value is PetBehaviorState {
  return behaviorStates.includes(value as PetBehaviorState);
}

function isTone(value: unknown): value is ManagerBehaviorIntent["tone"] {
  return tones.includes(value as ManagerBehaviorIntent["tone"]);
}
