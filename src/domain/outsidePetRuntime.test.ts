import { describe, expect, it } from "vitest";
import type { InteractionObject } from "./interactionObjects";
import * as outsidePetRuntime from "./outsidePetRuntime";
import {
  advanceOutsidePetBehavior,
  outsidePetFieldRect,
  outsidePetSpriteSize,
  resolveOutsidePetDirection,
  resolveOutsidePetLayerZIndex,
  resolveOutsidePetAnimationSpeed,
  resolveOutsidePetHorizontalMove,
  resolveOutsidePetRoamPosition,
  shouldUseImmediateOutsidePetPosition,
  resolveStoppedInteractionAnimation,
  resolveReturningOutsidePetStep,
  resolveRenderedOutsidePet,
  startOutsidePetBehavior,
  type OutsidePetState,
} from "./outsidePetRuntime";

const ladder: InteractionObject = {
  id: "ladder-1",
  type: "ladder",
  resizeAxis: "vertical",
  rect: { x: 300, y: 240, width: 36, height: 160 },
};

const platform: InteractionObject = {
  id: "platform-1",
  type: "platform",
  resizeAxis: "horizontal",
  rect: { x: 360, y: 360, width: 160, height: 22 },
};

function createPet(patch: Partial<OutsidePetState> = {}): OutsidePetState {
  return {
    phase: "free_roam",
    side: "left",
    position: { x: outsidePetFieldRect.x + 40, y: outsidePetFieldRect.y },
    direction: 1,
    animation: "walk",
    roamTicks: 0,
    ...patch,
  };
}

describe("outside pet runtime", () => {
  it("keeps a climbing pet attached to its ladder", () => {
    const pet = createPet({ animation: "climbing", attachedObjectId: ladder.id });

    expect(resolveRenderedOutsidePet(pet, [ladder]).position).toEqual({
      x: ladder.rect.x + ladder.rect.width / 2 - outsidePetSpriteSize / 2,
      y: ladder.rect.y + ladder.rect.height * 0.48 - outsidePetSpriteSize / 2,
    });
  });

  it("preserves climb progress while deriving a climbing render position", () => {
    const pet = createPet({
      animation: "climbing",
      attachedObjectId: ladder.id,
      behavior: "descend_ladder",
      climbProgress: 0.8,
    });

    expect(resolveRenderedOutsidePet(pet, [ladder]).position).toEqual({
      x: ladder.rect.x + ladder.rect.width / 2 - outsidePetSpriteSize / 2,
      y: ladder.rect.y + ladder.rect.height * 0.8 - outsidePetSpriteSize / 2,
    });
  });

  it("turns back into the outside field at horizontal edges", () => {
    expect(resolveOutsidePetDirection(createPet({ position: { x: outsidePetFieldRect.x, y: outsidePetFieldRect.y } }), [])).toBe(1);
    expect(
      resolveOutsidePetDirection(
        createPet({ position: { x: outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize, y: outsidePetFieldRect.y } }),
        [],
      ),
    ).toBe(-1);
  });

  it("keeps its facing direction inside an interaction target dead zone", () => {
    const petCenterNearLadder = ladder.rect.x + ladder.rect.width / 2 - 18;
    const pet = createPet({
      position: { x: petCenterNearLadder - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y },
      direction: 1,
      roamTicks: 7,
    });

    expect(resolveOutsidePetDirection(pet, [ladder])).toBe(1);
  });

  it("does not move horizontally inside an interaction target dead zone", () => {
    const petCenterNearLadder = ladder.rect.x + ladder.rect.width / 2 - 18;
    const pet = createPet({
      position: { x: petCenterNearLadder - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y },
      direction: 1,
      roamTicks: 7,
    });

    expect(resolveOutsidePetHorizontalMove(pet, [ladder], 22)).toEqual({
      x: pet.position.x,
      direction: 1,
      stoppedForTarget: true,
    });
  });

  it("starts a ladder behavior when stopped at a ladder target", () => {
    const petCenterNearLadder = ladder.rect.x + ladder.rect.width / 2;
    const pet = createPet({
      position: { x: petCenterNearLadder - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y },
      direction: 1,
      animation: "walk",
    });

    expect(resolveStoppedInteractionAnimation(pet, [ladder, platform])).toBe("climbing");
  });

  it("attaches to the ladder when starting a stopped ladder behavior from the ground", () => {
    const petCenterNearLadder = ladder.rect.x + ladder.rect.width / 2;
    const pet = createPet({
      position: { x: petCenterNearLadder - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y },
      direction: 1,
      animation: "walk",
    });

    const climbing = startOutsidePetBehavior(pet, [ladder], "climbing");

    expect(climbing).toMatchObject({
      animation: "climbing",
      behavior: "climb_ladder",
      attachedObjectId: ladder.id,
      climbProgress: 0.48,
    });
    expect(climbing.position).toEqual(resolveRenderedOutsidePet(climbing, [ladder]).position);

    const movedLadder = { ...ladder, rect: { ...ladder.rect, x: ladder.rect.x + 120, y: ladder.rect.y - 40 } };
    expect(resolveRenderedOutsidePet(climbing, [movedLadder]).position).toEqual({
      x: movedLadder.rect.x + movedLadder.rect.width / 2 - outsidePetSpriteSize / 2,
      y: movedLadder.rect.y + movedLadder.rect.height * 0.48 - outsidePetSpriteSize / 2,
    });
  });

  it("starts a platform behavior only when the platform is the stopped target", () => {
    const petCenterNearPlatform = platform.rect.x + platform.rect.width / 2;
    const pet = createPet({
      position: { x: petCenterNearPlatform - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y },
      direction: 1,
      animation: "walk",
    });

    expect(resolveStoppedInteractionAnimation(pet, [ladder, platform])).toBe("jump");
  });

  it("does not jump to a platform when stopped at a closer ladder", () => {
    const nearbyPlatform = { ...platform, rect: { ...platform.rect, x: ladder.rect.x + 90 } };
    const petCenterNearLadder = ladder.rect.x + ladder.rect.width / 2;
    const pet = createPet({
      position: { x: petCenterNearLadder - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y },
      direction: 1,
      animation: "walk",
    });

    expect(resolveStoppedInteractionAnimation(pet, [nearbyPlatform, ladder])).toBe("climbing");
  });

  it("keeps still animations from moving horizontally", () => {
    expect(resolveOutsidePetAnimationSpeed("idle")).toBe(0);
    expect(resolveOutsidePetAnimationSpeed("happy")).toBe(0);
    expect(resolveOutsidePetAnimationSpeed("hiding")).toBe(0);
    expect(resolveOutsidePetAnimationSpeed("recovering")).toBe(0);
    expect(resolveOutsidePetAnimationSpeed("focused")).toBe(0);
  });

  it("does not snap upward onto a platform during a non-platform idle tick", () => {
    const pet = createPet({
      animation: "idle",
      behavior: "idle",
      position: { x: platform.rect.x + platform.rect.width / 2 - outsidePetSpriteSize / 2, y: platform.rect.y - outsidePetSpriteSize + 12 },
    });

    expect(resolveOutsidePetRoamPosition(pet, "idle", { x: pet.position.x, y: outsidePetFieldRect.y }, [platform])).toEqual({
      x: pet.position.x,
      y: outsidePetFieldRect.y,
    });
  });

  it("keeps walk and run speeds visually distinct", () => {
    expect(resolveOutsidePetAnimationSpeed("walk")).toBe(11);
    expect(resolveOutsidePetAnimationSpeed("run")).toBe(21);
    expect(resolveOutsidePetAnimationSpeed("run")).toBeGreaterThan(resolveOutsidePetAnimationSpeed("walk"));
    expect(resolveOutsidePetAnimationSpeed("jump")).toBeGreaterThan(0);
    expect(resolveOutsidePetAnimationSpeed("climbing")).toBe(0);
  });

  it("uses immediate positioning while attached to ladder or platform objects", () => {
    expect(shouldUseImmediateOutsidePetPosition(createPet({ behavior: "climb_ladder", attachedObjectId: ladder.id }))).toBe(true);
    expect(shouldUseImmediateOutsidePetPosition(createPet({ behavior: "idle_on_platform", platformId: platform.id }))).toBe(true);
    expect(shouldUseImmediateOutsidePetPosition(createPet({ behavior: "jump_down", platformId: platform.id }))).toBe(true);
    expect(shouldUseImmediateOutsidePetPosition(createPet({ behavior: "wander" }))).toBe(false);
  });

  it("keeps platform-attached pets above the platform window z-index", () => {
    const pet = createPet({ behavior: "idle_on_platform", platformId: platform.id });

    expect(resolveOutsidePetLayerZIndex(pet, { [platform.id]: 44 })).toBe(45);
  });

  it("exposes behavior advancement for multi-tick outside actions", () => {
    const runtimeModule: Record<string, unknown> = outsidePetRuntime;

    expect(typeof runtimeModule.advanceOutsidePetBehavior).toBe("function");
  });

  it("loops a ladder climb through hold, descend, and idle", () => {
    const climbing = createPet({
      animation: "climbing",
      attachedObjectId: ladder.id,
      behavior: "climb_ladder",
      behaviorTicks: 1,
      climbProgress: 0.8,
    });

    const holding = advanceOutsidePetBehavior(climbing, [ladder]);
    expect(holding).toMatchObject({
      animation: "climbing",
      behavior: "hold_ladder",
      attachedObjectId: ladder.id,
      climbProgress: 1,
    });

    const descending = advanceOutsidePetBehavior(holding, [ladder]);
    expect(descending).toMatchObject({
      animation: "climbing",
      behavior: "descend_ladder",
      attachedObjectId: ladder.id,
    });

    const grounded = advanceOutsidePetBehavior({ ...descending, climbProgress: 0.2 }, [ladder]);
    expect(grounded).toMatchObject({
      animation: "idle",
      behavior: "idle",
      attachedObjectId: undefined,
      climbProgress: undefined,
    });
  });

  it("starts a ladder climb with explicit behavior metadata", () => {
    const pet = createPet({ animation: "walk", position: { x: ladder.rect.x - 24, y: ladder.rect.y + 72 } });

    expect(startOutsidePetBehavior(pet, [ladder], "climbing")).toMatchObject({
      animation: "climbing",
      behavior: "climb_ladder",
      behaviorTicks: 0,
      attachedObjectId: ladder.id,
      climbProgress: 0.48,
    });
  });

  it("loops a platform jump through land, idle, jump down, and ground idle", () => {
    const pet = createPet({
      animation: "walk",
      position: { x: platform.rect.x + 24, y: platform.rect.y - outsidePetSpriteSize + 20 },
    });

    const jumping = startOutsidePetBehavior(pet, [platform], "jump");
    expect(jumping).toMatchObject({
      animation: "jump",
      behavior: "jump_to_platform",
      behaviorTicks: 0,
      platformId: platform.id,
    });
    expect(jumping.position.y).toBeLessThan(pet.position.y);

    const landed = advanceOutsidePetBehavior({ ...jumping, behaviorTicks: 1 }, [platform]);
    expect(landed).toMatchObject({
      animation: "idle",
      behavior: "land_on_platform",
      platformId: platform.id,
    });

    const idling = advanceOutsidePetBehavior(landed, [platform]);
    expect(idling).toMatchObject({
      animation: "idle",
      behavior: "idle_on_platform",
      platformId: platform.id,
    });

    const movedPlatform = { ...platform, rect: { ...platform.rect, x: platform.rect.x + 80 } };
    const rendered = resolveRenderedOutsidePet(idling, [movedPlatform]);
    expect(rendered.position.x).toBe(movedPlatform.rect.x + movedPlatform.rect.width / 2 - outsidePetSpriteSize / 2);

    const jumpingDown = advanceOutsidePetBehavior({ ...idling, behaviorTicks: 2 }, [platform]);
    expect(jumpingDown).toMatchObject({
      animation: "jump",
      behavior: "jump_down",
      platformId: platform.id,
    });

    const grounded = advanceOutsidePetBehavior({ ...jumpingDown, behaviorTicks: 1 }, [platform]);
    expect(grounded).toMatchObject({
      animation: "idle",
      behavior: "idle",
      platformId: undefined,
    });
    expect(grounded.position.y).toBe(outsidePetFieldRect.y);
  });

  it("keeps platform jumps visually attached while the platform moves", () => {
    const movedPlatform = { ...platform, rect: { ...platform.rect, x: platform.rect.x + 96, y: platform.rect.y - 32 } };

    const jumpingToPlatform = createPet({
      animation: "jump",
      behavior: "jump_to_platform",
      behaviorTicks: 0,
      platformId: platform.id,
      position: { x: platform.rect.x, y: platform.rect.y - outsidePetSpriteSize },
    });
    expect(resolveRenderedOutsidePet(jumpingToPlatform, [movedPlatform]).position).toEqual({
      x: movedPlatform.rect.x + movedPlatform.rect.width / 2 - outsidePetSpriteSize / 2,
      y: movedPlatform.rect.y - outsidePetSpriteSize - 24,
    });

    const jumpingDown = createPet({
      animation: "jump",
      behavior: "jump_down",
      behaviorTicks: 0,
      platformId: platform.id,
      position: { x: platform.rect.x, y: platform.rect.y - outsidePetSpriteSize },
    });
    expect(resolveRenderedOutsidePet(jumpingDown, [movedPlatform]).position).toEqual({
      x: movedPlatform.rect.x + movedPlatform.rect.width / 2 - outsidePetSpriteSize / 2 + jumpingDown.direction * 24,
      y: movedPlatform.rect.y - outsidePetSpriteSize - 12,
    });
  });

  it("stops at the screen edge before playing hiding while returning", () => {
    const pet = createPet({
      phase: "returning",
      side: "right",
      animation: "walk",
      direction: 1,
      position: { x: 1024 - outsidePetSpriteSize - 20, y: outsidePetFieldRect.y },
    });

    expect(resolveReturningOutsidePetStep(pet, 1024)).toMatchObject({
      animation: "hiding",
      direction: 1,
      position: { x: 1024 - outsidePetSpriteSize - 16, y: outsidePetFieldRect.y },
    });
  });
});
