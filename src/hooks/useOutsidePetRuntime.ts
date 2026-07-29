import { useEffect } from "react";
import type { PetAnimationState } from "../data/assetManifest";
import type { InteractionObject } from "../domain/interactionObjects";
import {
  getNearestOutsidePetSide,
  getNearbyLadder,
  outsidePetFieldRect,
  outsidePetInitialState,
  outsidePetSpriteSize,
  resolveOutsidePetAttachmentPosition,
  resolveOutsidePetDirection,
  resolveOutsidePetRoamPosition,
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
            roamTicks: 0,
            attachedObjectId: undefined,
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
        const petRect = { x: current.position.x, y: current.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };
        const attachedObject = current.attachedObjectId
          ? interactionObjects.find((object) => object.id === current.attachedObjectId)
          : undefined;
        const nextAnimation = getNextRoamAnimation(current, interactionObjects);
        const nextDirection = resolveOutsidePetDirection(current, interactionObjects);
        const speed = nextAnimation === "run" ? 42 : nextAnimation === "jump" ? 28 : nextAnimation === "climbing" ? 0 : 22;
        const rawX = current.position.x + speed * nextDirection;
        const minX = outsidePetFieldRect.x;
        const maxX = outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize;
        const clampedX = Math.min(Math.max(rawX, minX), maxX);
        const nextAttachedObject = nextAnimation === "climbing"
          ? attachedObject?.type === "ladder"
            ? attachedObject
            : getNearbyLadder(petRect, interactionObjects)
          : undefined;
        const nextPosition = nextAttachedObject
          ? resolveOutsidePetAttachmentPosition(nextAttachedObject, nextAnimation)
          : resolveOutsidePetRoamPosition(current, nextAnimation, { x: clampedX, y: nextAnimation === "jump" ? outsidePetFieldRect.y - 26 : outsidePetFieldRect.y }, interactionObjects);

        return {
          ...current,
          animation: nextAnimation,
          attachedObjectId: nextAttachedObject?.id,
          direction: clampedX === minX ? 1 : clampedX === maxX ? -1 : nextDirection,
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
        attachedObjectId: undefined,
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

        const step = current.side === "left" ? -22 : 22;
        const nextX = current.position.x + step;
        const reachedEdge = current.side === "left" ? nextX <= -outsidePetSpriteSize : nextX >= window.innerWidth;
        if (reachedEdge) return outsidePetInitialState;

        return {
          ...current,
          animation: nextX < 16 || nextX > window.innerWidth - outsidePetSpriteSize - 16 ? "hiding" : "walk",
          direction: step > 0 ? 1 : -1,
          position: { x: nextX, y: outsidePetFieldRect.y },
        };
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [outsidePet.phase, setOutsidePet]);
}
