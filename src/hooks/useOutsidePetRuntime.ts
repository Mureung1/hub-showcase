import { useEffect } from "react";
import type { PetAnimationState } from "../data/assetManifest";
import type { InteractionObject } from "../domain/interactionObjects";
import {
  advanceOutsidePetBehavior,
  getNearestOutsidePetSide,
  getNearbyLadder,
  outsidePetFieldRect,
  outsidePetInitialState,
  outsidePetSpriteSize,
  resolveOutsidePetAnimationSpeed,
  resolveOutsidePetAttachmentPosition,
  resolveOutsidePetHorizontalMove,
  resolveOutsidePetRoamPosition,
  resolveReturningOutsidePetStep,
  startOutsidePetBehavior,
  type OutsidePetState,
} from "../domain/outsidePetRuntime";
import type { WindowId } from "../data/windowRegistry";

export interface UseOutsidePetRuntimeInput {
  outsidePet: OutsidePetState;
  setOutsidePet: React.Dispatch<React.SetStateAction<OutsidePetState>>;
  interactionObjects: InteractionObject[];
  openWindows: WindowId[];
  getNextRoamAnimation: (pet: OutsidePetState, objects: InteractionObject[]) => PetAnimationState;
}

export function useOutsidePetRuntime({
  outsidePet,
  setOutsidePet,
  interactionObjects,
  openWindows,
  getNextRoamAnimation,
}: UseOutsidePetRuntimeInput) {
  useEffect(() => {
    if (outsidePet.phase !== "peek_from_edge") return undefined;

    const timer = window.setTimeout(() => {
      setOutsidePet((current) => ({
        ...current,
        phase: "walk_in",
        animation: "walk",
        position: {
          x: current.side === "left" ? outsidePetFieldRect.x - 42 : outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize + 42,
          y: outsidePetFieldRect.y,
        },
      }));
    }, 820);

    return () => window.clearTimeout(timer);
  }, [outsidePet.phase, setOutsidePet]);

  useEffect(() => {
    if (outsidePet.phase !== "walk_in") return undefined;

    const targetX = outsidePet.side === "left" ? outsidePetFieldRect.x + 64 : outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize - 64;
    const timer = window.setInterval(() => {
      setOutsidePet((current) => {
        if (current.phase !== "walk_in") return current;

        const step = current.side === "left" ? 18 : -18;
        const nextX = current.position.x + step;
        const reachedTarget = current.side === "left" ? nextX >= targetX : nextX <= targetX;
        if (reachedTarget) {
          return {
            ...current,
            phase: "free_roam",
            animation: "idle",
            behavior: "idle",
            behaviorTicks: 0,
            roamTicks: 0,
            attachedObjectId: undefined,
            platformId: undefined,
            climbProgress: undefined,
            position: { ...current.position, x: targetX },
          };
        }

        return { ...current, position: { ...current.position, x: nextX }, direction: step > 0 ? 1 : -1 };
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [outsidePet.phase, outsidePet.side, setOutsidePet]);

  useEffect(() => {
    if (outsidePet.phase !== "free_roam") return undefined;

    const timer = window.setInterval(() => {
      setOutsidePet((current) => {
        if (current.phase !== "free_roam") return current;

        const nextRoamTicks = current.roamTicks + 1;
        if (
          current.behavior === "climb_ladder" ||
          current.behavior === "hold_ladder" ||
          current.behavior === "descend_ladder" ||
          current.behavior === "jump_to_platform" ||
          current.behavior === "land_on_platform" ||
          current.behavior === "idle_on_platform" ||
          current.behavior === "jump_down"
        ) {
          return { ...advanceOutsidePetBehavior(current, interactionObjects), roamTicks: nextRoamTicks };
        }

        const petRect = { x: current.position.x, y: current.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };
        const attachedObject = current.attachedObjectId
          ? interactionObjects.find((object) => object.id === current.attachedObjectId)
          : undefined;
        const nextAnimation = getNextRoamAnimation(current, interactionObjects);
        const speed = resolveOutsidePetAnimationSpeed(nextAnimation);
        const horizontalMove = resolveOutsidePetHorizontalMove(current, interactionObjects, speed);
        const clampedX = horizontalMove.x;
        const resolvedAnimation = horizontalMove.stoppedForTarget && (nextAnimation === "walk" || nextAnimation === "run") ? "idle" : nextAnimation;
        if (resolvedAnimation === "climbing") {
          return { ...startOutsidePetBehavior(current, interactionObjects, resolvedAnimation), roamTicks: nextRoamTicks };
        }

        if (resolvedAnimation === "jump") {
          const startedJump = startOutsidePetBehavior(current, interactionObjects, resolvedAnimation);
          if (startedJump.behavior === "jump_to_platform") return { ...startedJump, roamTicks: nextRoamTicks };
        }

        const nextAttachedObject = nextAnimation === "climbing"
          ? attachedObject?.type === "ladder"
            ? attachedObject
            : getNearbyLadder(petRect, interactionObjects)
          : undefined;
        const nextPosition = nextAttachedObject
          ? resolveOutsidePetAttachmentPosition(nextAttachedObject, resolvedAnimation)
          : resolveOutsidePetRoamPosition(current, resolvedAnimation, { x: clampedX, y: resolvedAnimation === "jump" ? outsidePetFieldRect.y - 26 : outsidePetFieldRect.y }, interactionObjects);

        return {
          ...current,
          animation: resolvedAnimation,
          attachedObjectId: nextAttachedObject?.id,
          direction: horizontalMove.direction,
          roamTicks: nextRoamTicks,
          position: nextPosition,
        };
      });
    }, 1100);

    return () => window.clearInterval(timer);
  }, [getNextRoamAnimation, interactionObjects, outsidePet.phase, setOutsidePet]);

  useEffect(() => {
    if (outsidePet.phase !== "free_roam" || outsidePet.animation !== "climbing" || !outsidePet.attachedObjectId) return;

    const attachedObject = interactionObjects.find((object) => object.id === outsidePet.attachedObjectId);
    if (!attachedObject || attachedObject.type !== "ladder") return;

    const nextPosition = resolveOutsidePetAttachmentPosition(attachedObject, "climbing");
    setOutsidePet((current) => {
      if (current.phase !== "free_roam" || current.animation !== "climbing" || current.attachedObjectId !== attachedObject.id) return current;
      if (current.position.x === nextPosition.x && current.position.y === nextPosition.y) return current;
      return { ...current, position: nextPosition };
    });
  }, [interactionObjects, outsidePet.phase, outsidePet.animation, outsidePet.attachedObjectId, setOutsidePet]);

  useEffect(() => {
    if (outsidePet.phase !== "free_roam" || openWindows.includes("journal")) return;

    setOutsidePet((current) => {
      if (current.phase !== "free_roam") return current;

      const side = getNearestOutsidePetSide(current.position);
      return {
        ...current,
        phase: "returning",
        side,
        animation: "walk",
        behavior: undefined,
        behaviorTicks: undefined,
        attachedObjectId: undefined,
        platformId: undefined,
        climbProgress: undefined,
        direction: side === "left" ? -1 : 1,
        position: { ...current.position, y: outsidePetFieldRect.y },
      };
    });
  }, [openWindows, outsidePet.phase, setOutsidePet]);

  useEffect(() => {
    if (outsidePet.phase !== "returning") return undefined;

    const timer = window.setInterval(() => {
      setOutsidePet((current) => {
        if (current.phase !== "returning") return current;
        return resolveReturningOutsidePetStep(current, window.innerWidth);
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [outsidePet.phase, setOutsidePet]);
}
