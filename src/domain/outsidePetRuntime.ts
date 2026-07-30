import type { PetAnimationState } from "../data/assetManifest";
import { getClimbPosition, type InteractionObject } from "./interactionObjects";

export type OutsidePetPhase = "inside" | "blink" | "peek_from_edge" | "walk_in" | "free_roam" | "returning";
export type OutsidePetSide = "left" | "right";

export interface InteractionSpritePosition {
  x: number;
  y: number;
}

export interface OutsidePetState {
  phase: OutsidePetPhase;
  side: OutsidePetSide;
  position: InteractionSpritePosition;
  direction: 1 | -1;
  animation: PetAnimationState;
  roamTicks: number;
  behavior?: OutsidePetBehavior;
  behaviorTicks?: number;
  climbProgress?: number;
  attachedObjectId?: string;
  platformId?: string;
}

export type OutsidePetBehavior =
  | "idle"
  | "wander"
  | "climb_ladder"
  | "hold_ladder"
  | "descend_ladder"
  | "jump_to_platform"
  | "land_on_platform"
  | "idle_on_platform"
  | "jump_down";

export const outsidePetFieldRect = { x: 190, y: 620, width: 780, height: 116 };
export const outsidePetSpriteSize = 96;
export const outsidePetWalkInStepPx = 10;
export const outsidePetInteractionCandidateRangePx = 220;
export const outsidePetFreeRoamTickMs = 1100;
export const outsidePetFreeRoamStateChangeTicks = 7;
const outsidePetLadderBottomReachPx = 96;

export const outsidePetInitialState: OutsidePetState = {
  phase: "inside",
  side: "left",
  position: { x: outsidePetFieldRect.x, y: outsidePetFieldRect.y },
  direction: 1,
  animation: "idle",
  roamTicks: 0,
};

export function getNearestOutsidePetSide(position: InteractionSpritePosition): OutsidePetSide {
  const fieldCenter = outsidePetFieldRect.x + outsidePetFieldRect.width / 2;
  return position.x < fieldCenter ? "left" : "right";
}

export function resolveOutsidePetRoamPosition(
  pet: OutsidePetState,
  animation: PetAnimationState,
  fallbackPosition: InteractionSpritePosition,
  objects: InteractionObject[],
): InteractionSpritePosition {
  const petRect = { x: pet.position.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };

  if (animation === "climbing") {
    const ladder = getNearbyLadder(petRect, objects);
    if (ladder) return resolveOutsidePetAttachmentPosition(ladder, animation);
  }

  if (animation === "jump") {
    const platform = getNearbyPlatform(petRect, objects);
    if (platform) return { x: platform.rect.x + platform.rect.width / 2 - outsidePetSpriteSize / 2, y: platform.rect.y - outsidePetSpriteSize + 12 };
  }

  return { x: fallbackPosition.x, y: outsidePetFieldRect.y };
}

export function resolveOutsidePetAttachmentPosition(object: InteractionObject, animation: PetAnimationState, climbProgress = 0.48): InteractionSpritePosition {
  if (animation === "climbing" && object.type === "ladder") {
    const climbPosition = getClimbPosition(object.rect, climbProgress);
    return { x: climbPosition.x - outsidePetSpriteSize / 2, y: climbPosition.y - outsidePetSpriteSize / 2 };
  }

  return { x: object.rect.x + object.rect.width / 2 - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y };
}

export function resolveRenderedOutsidePet(pet: OutsidePetState, objects: InteractionObject[]): OutsidePetState {
  if (pet.phase !== "free_roam") return pet;

  if (
    pet.platformId &&
    (pet.behavior === "jump_to_platform" ||
      pet.behavior === "land_on_platform" ||
      pet.behavior === "idle_on_platform" ||
      pet.behavior === "jump_down")
  ) {
    const platform = objects.find((object) => object.id === pet.platformId && object.type === "platform");
    if (!platform) return pet;
    return {
      ...pet,
      position: resolvePlatformBehaviorRenderPosition(pet, platform),
    };
  }

  if (pet.animation !== "climbing" || !pet.attachedObjectId) return pet;

  const attachedObject = objects.find((object) => object.id === pet.attachedObjectId);
  if (!attachedObject || attachedObject.type !== "ladder") return pet;

  return {
    ...pet,
    position: resolveOutsidePetAttachmentPosition(attachedObject, "climbing", pet.climbProgress ?? 0.48),
  };
}

export function resolveOutsidePetDirection(pet: OutsidePetState, objects: InteractionObject[]): 1 | -1 {
  const minX = outsidePetFieldRect.x;
  const maxX = outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize;
  if (pet.position.x <= minX + 12) return 1;
  if (pet.position.x >= maxX - 12) return -1;

  if (isInsideInteractionObjectDirectionDeadZone(pet, objects)) return pet.direction;

  const targetDirection = getInteractionObjectApproachDirection(pet, objects);
  if (targetDirection) return targetDirection;

  const shouldTurn = pet.roamTicks > 0 && pet.roamTicks % 7 === 0;
  if (shouldTurn) return pet.direction === 1 ? -1 : 1;
  return pet.direction;
}

export function resolveOutsidePetAnimationSpeed(animation: PetAnimationState): number {
  if (animation === "run") return 14;
  if (animation === "walk") return 7;
  if (animation === "jump") return 18;
  return 0;
}

export function resolveOutsidePetWalkInStep(pet: OutsidePetState, targetX: number): OutsidePetState {
  const step = pet.side === "left" ? outsidePetWalkInStepPx : -outsidePetWalkInStepPx;
  const nextX = pet.position.x + step;
  const reachedTarget = pet.side === "left" ? nextX >= targetX : nextX <= targetX;
  if (reachedTarget) {
    return {
      ...pet,
      phase: "free_roam",
      animation: "idle",
      behavior: "idle",
      behaviorTicks: outsidePetFreeRoamStateChangeTicks,
      roamTicks: 0,
      attachedObjectId: undefined,
      platformId: undefined,
      climbProgress: undefined,
      position: { ...pet.position, x: targetX, y: outsidePetFieldRect.y },
    };
  }

  return {
    ...pet,
    position: { x: nextX, y: outsidePetFieldRect.y },
    direction: step > 0 ? 1 : -1,
  };
}

export function resolveOutsidePetHorizontalMove(
  pet: OutsidePetState,
  objects: InteractionObject[],
  speed: number,
): { x: number; direction: 1 | -1; stoppedForTarget: boolean } {
  if (isInsideInteractionObjectDirectionDeadZone(pet, objects)) {
    return { x: pet.position.x, direction: pet.direction, stoppedForTarget: true };
  }

  const moveDirection = resolveOutsidePetDirection(pet, objects);
  const minX = outsidePetFieldRect.x;
  const maxX = outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize;
  const x = Math.min(Math.max(pet.position.x + speed * moveDirection, minX), maxX);

  if (x > pet.position.x) return { x, direction: 1, stoppedForTarget: false };
  if (x < pet.position.x) return { x, direction: -1, stoppedForTarget: false };
  return { x, direction: pet.direction, stoppedForTarget: false };
}

export function shouldChooseNextOutsidePetRoamAnimation(pet: OutsidePetState): boolean {
  return (pet.behaviorTicks ?? outsidePetFreeRoamStateChangeTicks) >= outsidePetFreeRoamStateChangeTicks;
}

export function resolveStoppedInteractionAnimation(pet: OutsidePetState, objects: InteractionObject[], requestedAnimation?: PetAnimationState): PetAnimationState | null {
  if (requestedAnimation === "jump") return null;
  const target = getNearestStoppedInteractionObject(pet, objects);
  if (target?.type === "ladder") return "climbing";
  if (target?.type === "platform") return "jump";
  return null;
}

export function resolveAvailableOutsidePetRoamAnimations(
  objects: InteractionObject[],
  supportedAnimations: PetAnimationState[],
  pet?: OutsidePetState,
): PetAnimationState[] {
  const hasLadder = hasInteractionCandidateInRange(objects, "ladder", pet);
  const hasPlatform = hasInteractionCandidateInRange(objects, "platform", pet);
  return supportedAnimations.filter((animation) => {
    if (animation === "climbing") return hasLadder;
    if (animation === "jump") return hasPlatform;
    if (animation === "hanging") return false;
    if (animation === "hiding") return false;
    return true;
  });
}

export function advanceOutsidePetBehavior(pet: OutsidePetState, _objects: InteractionObject[]): OutsidePetState {
  if (pet.behavior === "climb_ladder" || pet.behavior === "hold_ladder" || pet.behavior === "descend_ladder") {
    return advanceClimbBehavior(pet, _objects);
  }

  if (pet.behavior === "jump_to_platform" || pet.behavior === "land_on_platform" || pet.behavior === "idle_on_platform" || pet.behavior === "jump_down") {
    return advancePlatformBehavior(pet, _objects);
  }

  return pet;
}

export function startOutsidePetBehavior(pet: OutsidePetState, objects: InteractionObject[], animation: PetAnimationState): OutsidePetState {
  if (animation === "climbing") {
    const petRect = { x: pet.position.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };
    const ladder = pet.attachedObjectId
      ? objects.find((object) => object.id === pet.attachedObjectId && object.type === "ladder")
      : getStoppedInteractionObjectByType(pet, objects, "ladder") ?? getNearbyLadder(petRect, objects);

    if (ladder) {
      return {
        ...pet,
        animation,
        behavior: "climb_ladder",
        behaviorTicks: 0,
        attachedObjectId: ladder.id,
        climbProgress: 0.48,
        position: resolveOutsidePetAttachmentPosition(ladder, animation, 0.48),
      };
    }
  }

  if (animation === "jump") {
    const petRect = { x: pet.position.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };
    const platform = getStoppedInteractionObjectByType(pet, objects, "platform") ?? getNearbyPlatform(petRect, objects);
    if (platform) {
      return {
        ...pet,
        animation,
        behavior: "jump_to_platform",
        behaviorTicks: 0,
        platformId: platform.id,
        position: resolvePlatformBehaviorRenderPosition({ ...pet, behavior: "jump_to_platform" }, platform),
      };
    }
  }

  return { ...pet, animation, behavior: animation === "idle" ? "idle" : pet.behavior, behaviorTicks: animation === "idle" ? 0 : pet.behaviorTicks };
}

export function resolveReturningOutsidePetStep(pet: OutsidePetState, viewportWidth: number): OutsidePetState {
  if (pet.animation === "hiding") return outsidePetInitialState;

  const step = pet.side === "left" ? -22 : 22;
  const direction = step > 0 ? 1 : -1;
  const nextX = pet.position.x + step;
  const hideX = pet.side === "left" ? 16 : viewportWidth - outsidePetSpriteSize - 16;
  const reachedHideAnchor = pet.side === "left" ? nextX <= hideX : nextX >= hideX;

  if (reachedHideAnchor) {
    return {
      ...pet,
      animation: "hiding",
      direction,
      position: { x: hideX, y: outsidePetFieldRect.y },
    };
  }

  return {
    ...pet,
    animation: "walk",
    direction,
    position: { x: nextX, y: outsidePetFieldRect.y },
  };
}

export function shouldMirrorOutsidePet(pet: OutsidePetState): boolean {
  return pet.direction < 0;
}

export function shouldUseImmediateOutsidePetPosition(pet: OutsidePetState): boolean {
  return (
    ((pet.behavior === "climb_ladder" || pet.behavior === "hold_ladder" || pet.behavior === "descend_ladder") && Boolean(pet.attachedObjectId)) ||
    ((pet.behavior === "jump_to_platform" ||
      pet.behavior === "land_on_platform" ||
      pet.behavior === "idle_on_platform" ||
      pet.behavior === "jump_down") &&
      Boolean(pet.platformId))
  );
}

export function resolveOutsidePetLayerZIndex(
  pet: OutsidePetState,
  objectZIndexes: Partial<Record<string, number>>,
  fallbackZIndex = 18,
): number {
  if (pet.platformId && isPlatformBehavior(pet.behavior)) {
    const platformZIndex = objectZIndexes[pet.platformId];
    if (typeof platformZIndex === "number") return platformZIndex + 1;
  }

  if (pet.attachedObjectId && isLadderBehavior(pet.behavior)) {
    const ladderZIndex = objectZIndexes[pet.attachedObjectId];
    if (typeof ladderZIndex === "number") return ladderZIndex + 1;
  }

  if (pet.phase === "peek_from_edge") return 12;
  if (pet.animation === "climbing") return 80;
  return fallbackZIndex;
}

function isPlatformBehavior(behavior: OutsidePetBehavior | undefined) {
  return behavior === "jump_to_platform" || behavior === "land_on_platform" || behavior === "idle_on_platform" || behavior === "jump_down";
}

function isLadderBehavior(behavior: OutsidePetBehavior | undefined) {
  return behavior === "climb_ladder" || behavior === "hold_ladder" || behavior === "descend_ladder";
}

function getInteractionObjectApproachDirection(pet: OutsidePetState, objects: InteractionObject[]): 1 | -1 | null {
  const objectTargets = objects
    .filter((object) => object.type === "ladder" || object.type === "platform")
    .map((object) => ({ object, distance: Math.abs(getRectCenterX(object.rect) - (pet.position.x + outsidePetSpriteSize / 2)) }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = objectTargets[0];
  if (!nearest || nearest.distance < 36 || nearest.distance > 340) return null;
  return getRectCenterX(nearest.object.rect) > pet.position.x + outsidePetSpriteSize / 2 ? 1 : -1;
}

function isInsideInteractionObjectDirectionDeadZone(pet: OutsidePetState, objects: InteractionObject[]): boolean {
  return getNearestStoppedInteractionObject(pet, objects) !== undefined;
}

function getNearestStoppedInteractionObject(pet: OutsidePetState, objects: InteractionObject[]): InteractionObject | undefined {
  const petCenterX = pet.position.x + outsidePetSpriteSize / 2;
  const targets = objects
    .filter((object) => object.type === "ladder" || object.type === "platform")
    .filter((object) => object.type !== "ladder" || isLadderReachableFromPet(pet, object))
    .map((object) => ({ object, distance: Math.abs(getRectCenterX(object.rect) - petCenterX) }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = targets[0];
  return nearest && nearest.distance < 36 ? nearest.object : undefined;
}

function getStoppedInteractionObjectByType(
  pet: OutsidePetState,
  objects: InteractionObject[],
  type: InteractionObject["type"],
): InteractionObject | undefined {
  const target = getNearestStoppedInteractionObject(pet, objects);
  return target?.type === type ? target : undefined;
}

function hasInteractionCandidateInRange(
  objects: InteractionObject[],
  type: "ladder" | "platform",
  pet: OutsidePetState | undefined,
): boolean {
  const candidates = objects.filter((object) => object.type === type);
  if (!pet) return candidates.length > 0;

  const petCenterX = pet.position.x + outsidePetSpriteSize / 2;
  return candidates.some((object) => Math.abs(getRectCenterX(object.rect) - petCenterX) <= outsidePetInteractionCandidateRangePx);
}

function advanceClimbBehavior(pet: OutsidePetState, objects: InteractionObject[]): OutsidePetState {
  const ladder = pet.attachedObjectId ? objects.find((object) => object.id === pet.attachedObjectId && object.type === "ladder") : undefined;
  if (!ladder) {
    return {
      ...pet,
      animation: "idle",
      behavior: "idle",
      behaviorTicks: 0,
      attachedObjectId: undefined,
      climbProgress: undefined,
      position: { x: pet.position.x, y: outsidePetFieldRect.y },
    };
  }

  if (pet.behavior === "climb_ladder") {
    const climbProgress = Math.min(1, (pet.climbProgress ?? 0) + 0.2);
    if (climbProgress >= 1) {
      return {
        ...pet,
        animation: "climbing",
        behavior: "hold_ladder",
        behaviorTicks: 0,
        climbProgress,
        position: resolveOutsidePetAttachmentPosition(ladder, "climbing", climbProgress),
      };
    }

    return {
      ...pet,
      animation: "climbing",
      behaviorTicks: (pet.behaviorTicks ?? 0) + 1,
      climbProgress,
      position: resolveOutsidePetAttachmentPosition(ladder, "climbing", climbProgress),
    };
  }

  if (pet.behavior === "hold_ladder") {
    return {
      ...pet,
      animation: "climbing",
      behavior: "descend_ladder",
      behaviorTicks: 0,
      climbProgress: pet.climbProgress ?? 1,
      position: resolveOutsidePetAttachmentPosition(ladder, "climbing", pet.climbProgress ?? 1),
    };
  }

  const climbProgress = Math.max(0, (pet.climbProgress ?? 1) - 0.2);
  if (climbProgress <= 0) {
    return {
      ...pet,
      animation: "idle",
      behavior: "idle",
      behaviorTicks: 0,
      attachedObjectId: undefined,
      climbProgress: undefined,
      position: { ...pet.position, y: outsidePetFieldRect.y },
    };
  }

  return {
    ...pet,
    animation: "climbing",
    behavior: "descend_ladder",
    behaviorTicks: (pet.behaviorTicks ?? 0) + 1,
    climbProgress,
    position: resolveOutsidePetAttachmentPosition(ladder, "climbing", climbProgress),
  };
}

function advancePlatformBehavior(pet: OutsidePetState, objects: InteractionObject[]): OutsidePetState {
  const platform = pet.platformId ? objects.find((object) => object.id === pet.platformId && object.type === "platform") : undefined;
  if (!platform) {
    return {
      ...pet,
      animation: "idle",
      behavior: "idle",
      behaviorTicks: 0,
      platformId: undefined,
      position: { x: pet.position.x, y: outsidePetFieldRect.y },
    };
  }

  if (pet.behavior === "jump_to_platform") {
    if ((pet.behaviorTicks ?? 0) >= 1) {
      return {
        ...pet,
        animation: "idle",
        behavior: "land_on_platform",
        behaviorTicks: 0,
        position: resolvePlatformStandPosition(platform),
      };
    }

    return {
      ...pet,
      animation: "jump",
      behaviorTicks: (pet.behaviorTicks ?? 0) + 1,
      position: resolvePlatformBehaviorRenderPosition(pet, platform),
    };
  }

  if (pet.behavior === "land_on_platform") {
    return {
      ...pet,
      animation: "idle",
      behavior: "idle_on_platform",
      behaviorTicks: 0,
      position: resolvePlatformStandPosition(platform),
    };
  }

  if (pet.behavior === "idle_on_platform") {
    if ((pet.behaviorTicks ?? 0) >= 2) {
      return {
        ...pet,
        animation: "jump",
        behavior: "jump_down",
        behaviorTicks: 0,
        position: resolvePlatformBehaviorRenderPosition({ ...pet, behavior: "jump_down" }, platform),
      };
    }

    return { ...pet, animation: "idle", behaviorTicks: (pet.behaviorTicks ?? 0) + 1, position: resolvePlatformStandPosition(platform) };
  }

  if ((pet.behaviorTicks ?? 0) >= 1) {
    const jumpDownPosition = resolvePlatformBehaviorRenderPosition(pet, platform);
    return {
      ...pet,
      animation: "idle",
      behavior: "idle",
      behaviorTicks: 0,
      platformId: undefined,
      position: { x: jumpDownPosition.x, y: outsidePetFieldRect.y },
    };
  }

  return {
    ...pet,
    animation: "jump",
    behaviorTicks: (pet.behaviorTicks ?? 0) + 1,
    position: resolvePlatformBehaviorRenderPosition(pet, platform),
  };
}

function resolvePlatformStandPosition(platform: InteractionObject): InteractionSpritePosition {
  return {
    x: platform.rect.x + platform.rect.width / 2 - outsidePetSpriteSize / 2,
    y: platform.rect.y - outsidePetSpriteSize + 12,
  };
}

function resolvePlatformBehaviorRenderPosition(pet: OutsidePetState, platform: InteractionObject): InteractionSpritePosition {
  const standPosition = resolvePlatformStandPosition(platform);
  if (pet.behavior === "jump_to_platform") return { x: standPosition.x, y: standPosition.y - 36 };
  if (pet.behavior === "jump_down") return { x: standPosition.x + pet.direction * 24, y: standPosition.y - 24 };
  return standPosition;
}

export function getNearbyLadder(petRect: { x: number; y: number; width: number; height: number }, objects: InteractionObject[]): InteractionObject | undefined {
  return objects.find((object) => object.type === "ladder" && isLadderReachableFromRect(petRect, object));
}

function getNearbyPlatform(petRect: { x: number; y: number; width: number; height: number }, objects: InteractionObject[]): InteractionObject | undefined {
  return objects.find((object) => {
    if (object.type !== "platform") return false;

    const petFootX = petRect.x + petRect.width / 2;
    const petFootY = petRect.y + petRect.height;
    const horizontalReach = petFootX >= object.rect.x - 72 && petFootX <= object.rect.x + object.rect.width + 72;
    const verticalReach = Math.abs(petFootY - object.rect.y) <= 150;
    return horizontalReach && verticalReach;
  });
}

function getRectCenterX(rect: { x: number; width: number }): number {
  return rect.x + rect.width / 2;
}

function isLadderReachableFromPet(pet: OutsidePetState, ladder: InteractionObject): boolean {
  return isLadderReachableFromRect({ x: pet.position.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize }, ladder);
}

function isLadderReachableFromRect(petRect: { x: number; y: number; width: number; height: number }, ladder: InteractionObject): boolean {
  const petCenterX = petRect.x + petRect.width / 2;
  const ladderCenterX = getRectCenterX(ladder.rect);
  const petTopY = petRect.y;
  const ladderBottomY = ladder.rect.y + ladder.rect.height;
  return Math.abs(ladderCenterX - petCenterX) < 36 && Math.abs(ladderBottomY - petTopY) <= outsidePetLadderBottomReachPx;
}

function isNearObject(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }, threshold: number) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by) <= threshold;
}
