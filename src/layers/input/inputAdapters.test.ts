import { describe, expect, it } from "vitest";
import { resolveGestureCommand } from "./inputAdapters";

describe("input adapters", () => {
  it("maps open hand to hover move", () => {
    expect(resolveGestureCommand("open_hand")).toBe("hover_move");
  });

  it("maps pinch to select", () => {
    expect(resolveGestureCommand("pinch")).toBe("select");
  });

  it("keeps fallback controls when tracking is lost", () => {
    expect(resolveGestureCommand("lost_tracking")).toBe("no_op");
  });
});
