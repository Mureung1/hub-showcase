import type { Rect, InteractionObject } from "./interactionObjects";
import { canJumpToPlatform } from "./petLocomotion";

export type PetBehaviorState =
  | "idle"
  | "wander"
  | "approach_ladder"
  | "climb_ladder"
  | "approach_platform"
  | "jump_to_platform"
  | "hide_behind_window"
  | "hang_on_window"
  | "escape_window"
  | "rest";

export type PetBehaviorAnimationState =
  | "idle"
  | "walk"
  | "run"
  | "climbing"
  | "jump"
  | "hiding"
  | "hanging"
  | "recovering"
  | "happy"
  | "focused";

export type PetBehaviorMood = "waiting" | "focused" | "happy" | "recovering";
export type PetBehaviorRecentEvent = "quest_completed" | "quest_failed" | "recovery_completed" | null;
export type PetBehaviorStyle = "balanced" | "adventurous" | "shy";

export interface BehaviorCandidate {
  state: PetBehaviorState;
  weight: number;
  reason: string;
}

export interface BehaviorContext {
  pet: Rect;
  objects: InteractionObject[];
  mood: PetBehaviorMood;
  recentEvent: PetBehaviorRecentEvent;
  reducedMotion: boolean;
  behaviorStyle?: PetBehaviorStyle;
  behaviorBias?: Array<{
    state: PetBehaviorState;
    weightDelta: number;
    reason: string;
  }>;
}

export function getBehaviorCandidates(_context: BehaviorContext): BehaviorCandidate[] {
  const candidates: BehaviorCandidate[] = [{ state: "idle", weight: 1, reason: "default" }];

  for (const object of _context.objects) {
    if (object.type === "ladder" && isNearRect(_context.pet, object.rect, 32)) {
      candidates.push({ state: "approach_ladder", weight: 4, reason: "near_ladder" });
    }

    if (object.type === "platform" && canJumpToPlatform(_context.pet, object.rect)) {
      candidates.push({ state: "jump_to_platform", weight: 3, reason: "near_platform" });
    }

    if (object.type === "window_escape_edge" && isNearRect(_context.pet, object.rect, 8)) {
      candidates.push({ state: "escape_window", weight: 3, reason: "near_escape_edge" });
    }
  }

  if (_context.mood === "recovering") {
    candidates.push({ state: "rest", weight: 3, reason: "recovering_mood" });
  }

  if (_context.recentEvent === "quest_failed") {
    candidates.push({ state: "hide_behind_window", weight: 3, reason: "recent_failure" });
  }

  if (_context.mood === "happy") {
    candidates.push({ state: "wander", weight: 2, reason: "happy_mood" });
  }

  if (_context.recentEvent === "quest_completed" || _context.recentEvent === "recovery_completed") {
    candidates.push({ state: "jump_to_platform", weight: 2, reason: "recent_success" });
  }

  return applyBehaviorBias(applyBehaviorStyleWeights(candidates, _context.behaviorStyle ?? "balanced"), _context.behaviorBias ?? []);
}

export function chooseWeightedBehavior(candidates: BehaviorCandidate[], randomValue: number): PetBehaviorState {
  const validCandidates = candidates.filter((candidate) => candidate.weight > 0);
  const totalWeight = validCandidates.reduce((total, candidate) => total + candidate.weight, 0);
  if (totalWeight <= 0) return "idle";

  const target = Math.max(0, Math.min(0.999999, randomValue)) * totalWeight;
  let cursor = 0;

  for (const candidate of validCandidates) {
    cursor += candidate.weight;
    if (target < cursor) return candidate.state;
  }

  return validCandidates[validCandidates.length - 1]?.state ?? "idle";
}

export function getNextBehaviorState(current: PetBehaviorState, context: BehaviorContext): PetBehaviorState {
  if (current === "approach_ladder" && context.objects.some((object) => object.type === "ladder" && isNearRect(context.pet, object.rect, 16))) {
    return "climb_ladder";
  }

  return current;
}

export function mapBehaviorToAnimation(behavior: PetBehaviorState, reducedMotion: boolean): PetBehaviorAnimationState {
  if (reducedMotion) {
    if (behavior === "climb_ladder" || behavior === "approach_ladder") return "focused";
    if (behavior === "jump_to_platform") return "happy";
  }

  if (behavior === "approach_ladder" || behavior === "approach_platform" || behavior === "wander" || behavior === "escape_window") return "walk";
  if (behavior === "climb_ladder") return "climbing";
  if (behavior === "jump_to_platform") return "jump";
  if (behavior === "hide_behind_window") return "hiding";
  if (behavior === "hang_on_window") return "hanging";
  if (behavior === "rest") return "recovering";
  return "idle";
}

function isNearRect(a: Rect, b: Rect, threshold: number): boolean {
  return (
    a.x < b.x + b.width + threshold &&
    a.x + a.width > b.x - threshold &&
    a.y < b.y + b.height + threshold &&
    a.y + a.height > b.y - threshold
  );
}

function applyBehaviorStyleWeights(candidates: BehaviorCandidate[], style: PetBehaviorStyle): BehaviorCandidate[] {
  if (style === "balanced") return candidates;

  return candidates.map((candidate) => {
    if (style === "adventurous" && (candidate.state === "jump_to_platform" || candidate.state === "approach_ladder")) {
      return { ...candidate, weight: candidate.weight + 2 };
    }

    if (style === "adventurous" && candidate.state === "wander") {
      return { ...candidate, weight: candidate.weight + 1 };
    }

    if (style === "shy" && candidate.state === "hide_behind_window") {
      return { ...candidate, weight: candidate.weight + 2 };
    }

    if (style === "shy" && candidate.state === "rest") {
      return { ...candidate, weight: candidate.weight + 1 };
    }

    if (style === "shy" && (candidate.state === "jump_to_platform" || candidate.state === "escape_window")) {
      return { ...candidate, weight: Math.max(1, candidate.weight - 1) };
    }

    return candidate;
  });
}

function applyBehaviorBias(candidates: BehaviorCandidate[], behaviorBias: NonNullable<BehaviorContext["behaviorBias"]>): BehaviorCandidate[] {
  if (behaviorBias.length === 0) return candidates;

  return candidates.map((candidate) => {
    const delta = behaviorBias
      .filter((bias) => bias.state === candidate.state)
      .reduce((total, bias) => total + bias.weightDelta, 0);

    return delta === 0 ? candidate : { ...candidate, weight: Math.max(1, candidate.weight + delta) };
  });
}
