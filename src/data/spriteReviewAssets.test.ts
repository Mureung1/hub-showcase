import { describe, expect, it } from "vitest";
import { getSpriteReviewAnimations, getSpriteReviewSet } from "./spriteReviewAssets";

describe("sprite review assets", () => {
  it("separates pink manager stage 1 idle candidates from stage 2 canonical sheets", () => {
    expect(getSpriteReviewSet("pink-manager-stage-1-production-candidates")).toMatchObject({
      path: "/assets/lumi/pink-manager-stage-1-production-candidates",
      stage: "stage-1",
    });
    expect(getSpriteReviewSet("pink-manager-stage-2-canonical")).toMatchObject({
      path: "/assets/lumi/pink-manager-stage-2",
      stage: "stage-2",
    });
  });

  it("exposes a single pink manager watching candidate for review", () => {
    const animations = getSpriteReviewAnimations("pink-manager-stage-2-watching-candidate");

    expect(animations).toHaveLength(1);
    expect(animations[0]).toMatchObject({
      id: "pink-manager-stage-2-watching-candidate-watching-review",
      src: "/assets/lumi/pink-manager-stage-2-production-candidates/pink-manager-stage-2-watching-sheet-v1.png",
      frameCount: 4,
      states: ["watching"],
    });
  });
});
