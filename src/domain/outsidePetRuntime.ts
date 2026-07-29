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

export const outsidePetFieldRect = { x: 190, y: 430, width: 780, height: 116 };
export const outsidePetSpriteSize = 96;

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

  const standingPlatform = getStandingPlatform({ x: fallbackPosition.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize }, objects);
  if (standingPlatform) return { x: fallbackPosition.x, y: standingPlatform.rect.y - outsidePetSpriteSize + 12 };

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

  if (pet.platformId && (pet.behavior === "land_on_platform" || pet.behavior === "idle_on_platform")) {
    const platform = objects.find((object) => object.id === pet.platformId && object.type === "platform");
    if (!platform) return pet;
    return {
      ...pet,
      position: resolvePlatformStandPosition(platform),
    };
  }

  if (pet.animation !== "climbing" || !pet.attachedObjectId) return pet;

  const attachedObject = objects.find((object) => object.id === pet.attachedObjectId);
  if (!attachedObject || attachedObject.type !== "ladder") return pet;

  return {
    ...pet,
    position: resolveOutsidePetAttachmentPosition(attachedObject, "climbing"),
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
  if (animation === "run") return 21;
  if (animation === "walk") return 11;
  if (animation === "jump") return 28;
  return 0;
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
      : getNearbyLadder(petRect, objects);

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
    const platform = getNearbyPlatform(petRect, objects);
    if (platform) {
      const standPosition = resolvePlatformStandPosition(platform);
      return {
        ...pet,
        animation,
        behavior: "jump_to_platform",
        behaviorTicks: 0,
        platformId: platform.id,
        position: { x: standPosition.x, y: standPosition.y - 36 },
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
  const petCenterX = pet.position.x + outsidePetSpriteSize / 2;
  return objects
    .filter((object) => object.type === "ladder" || object.type === "platform")
    .some((object) => Math.abs(getRectCenterX(object.rect) - petCenterX) < 36);
}

function advanceClimbBehavior(pet: OutsidePetState, objects: InteractionObject[]): OutsidePetState {
  const ladder = pet.attachedObjectId ? objects.find((object) => object.id === pet.attachedObjectId && object.type === "ladder") : undefined;
  if (!ladder) {
    return { ...pet, animation: "idle", behavior: "idle", behaviorTicks: 0, attachedObjectId: undefined, climbProgress: undefined };
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
    return { ...pet, animation: "idle", behavior: "idle", behaviorTicks: 0, platformId: undefined };
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

    return { ...pet, animation: "jump", behaviorTicks: (pet.behaviorTicks ?? 0) + 1 };
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
        position: { x: pet.position.x + pet.direction * 24, y: pet.position.y - 24 },
      };
    }

    return { ...pet, animation: "idle", behaviorTicks: (pet.behaviorTicks ?? 0) + 1, position: resolvePlatformStandPosition(platform) };
  }

  if ((pet.behaviorTicks ?? 0) >= 1) {
    return {
      ...pet,
      animation: "idle",
      behavior: "idle",
      behaviorTicks: 0,
      platformId: undefined,
      position: { x: pet.position.x, y: outsidePetFieldRect.y },
    };
  }

  return { ...pet, animation: "jump", behaviorTicks: (pet.behaviorTicks ?? 0) + 1 };
}

function resolvePlatformStandPosition(platform: InteractionObject): InteractionSpritePosition {
  return {
    x: platform.rect.x + platform.rect.width / 2 - outsidePetSpriteSize / 2,
    y: platform.rect.y - outsidePetSpriteSize + 12,
  };
}

export function getNearbyLadder(petRect: { x: number; y: number; width: number; height: number }, objects: InteractionObject[]): InteractionObject | undefined {
  return objects.find((object) => object.type === "ladder" && isNearObject(petRect, object.rect, 96));
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

function getStandingPlatform(petRect: { x: number; y: number; width: number; height: number }, objects: InteractionObject[]): InteractionObject | undefined {
  return objects.find((object) => {
    if (object.type !== "platform") return false;

    const petFootX = petRect.x + petRect.width / 2;
    const petFootY = petRect.y + petRect.height;
    const insidePlatform = petFootX >= object.rect.x && petFootX <= object.rect.x + object.rect.width;
    const closeToTop = Math.abs(petFootY - object.rect.y) <= 28;
    return insidePlatform && closeToTop;
  });
}

function getRectCenterX(rect: { x: number; width: number }): number {
  return rect.x + rect.width / 2;
}

function isNearObject(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }, threshold: number) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by) <= threshold;
}
