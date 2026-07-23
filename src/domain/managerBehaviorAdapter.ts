import { defaultManagerBehaviorIntent, normalizeManagerBehaviorIntent, type ManagerBehaviorIntent } from "./managerBehaviorIntent";
import {
  chooseWeightedBehavior,
  getBehaviorCandidates,
  getNextBehaviorState,
  mapBehaviorToAnimation,
  type BehaviorCandidate,
  type BehaviorContext,
  type PetBehaviorAnimationState,
  type PetBehaviorState,
} from "./petBehaviorStateMachine";

export interface ResolveManagerBehaviorInput {
  rawIntent: unknown;
  context: BehaviorContext;
  randomValue: number;
  fallbackIntent?: ManagerBehaviorIntent;
}

export interface ResolvedManagerBehavior {
  intent: ManagerBehaviorIntent;
  behavior: PetBehaviorState;
  animation: PetBehaviorAnimationState;
  candidates: BehaviorCandidate[];
  line: string;
}

export function resolveManagerBehavior(input: ResolveManagerBehaviorInput): ResolvedManagerBehavior {
  const intent = normalizeManagerBehaviorIntent(input.rawIntent, input.fallbackIntent ?? defaultManagerBehaviorIntent);
  const behaviorContext: BehaviorContext = {
    ...input.context,
    behaviorStyle: intent.behaviorStyle,
    behaviorBias: intent.suggestedBehaviorBias,
  };
  const candidates = getBehaviorCandidates(behaviorContext);
  const selectedBehavior = chooseWeightedBehavior(candidates, input.randomValue);
  const behavior = getNextBehaviorState(selectedBehavior, behaviorContext);

  return {
    intent,
    behavior,
    animation: mapBehaviorToAnimation(behavior, input.context.reducedMotion),
    candidates,
    line: intent.line,
  };
}
