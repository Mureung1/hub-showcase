import { describe, expect, it } from "vitest";
import type { InteractionObject } from "./interactionObjects";
import {
  outsidePetFieldRect,
  outsidePetSpriteSize,
  resolveOutsidePetDirection,
  resolveRenderedOutsidePet,
  type OutsidePetState,
} from "./outsidePetRuntime";

const ladder: InteractionObject = {
  id: "ladder-1",
  type: "ladder",
  resizeAxis: "vertical",
  rect: { x: 300, y: 240, width: 36, height: 160 },
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

  it("turns back into the outside field at horizontal edges", () => {
    expect(resolveOutsidePetDirection(createPet({ position: { x: outsidePetFieldRect.x, y: outsidePetFieldRect.y } }), [])).toBe(1);
    expect(
      resolveOutsidePetDirection(
        createPet({ position: { x: outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize, y: outsidePetFieldRect.y } }),
        [],
      ),
    ).toBe(-1);
  });
});
