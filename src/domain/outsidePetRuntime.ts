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
  attachedObjectId?: string;
}

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

export function resolveOutsidePetAttachmentPosition(object: InteractionObject, animation: PetAnimationState): InteractionSpritePosition {
  if (animation === "climbing" && object.type === "ladder") {
    const climbPosition = getClimbPosition(object.rect, 0.48);
    return { x: climbPosition.x - outsidePetSpriteSize / 2, y: climbPosition.y - outsidePetSpriteSize / 2 };
  }

  return { x: object.rect.x + object.rect.width / 2 - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y };
}

export function resolveRenderedOutsidePet(pet: OutsidePetState, objects: InteractionObject[]): OutsidePetState {
  if (pet.phase !== "free_roam" || pet.animation !== "climbing" || !pet.attachedObjectId) return pet;

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

  const targetDirection = getInteractionObjectApproachDirection(pet, objects);
  if (targetDirection) return targetDirection;

  const shouldTurn = pet.roamTicks > 0 && pet.roamTicks % 7 === 0;
  if (shouldTurn) return pet.direction === 1 ? -1 : 1;
  return pet.direction;
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
