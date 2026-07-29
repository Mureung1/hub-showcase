import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmotionSignalOrb from "./EmotionSignalOrb";

const globe = {
  update: vi.fn(),
  destroy: vi.fn()
};
const createGlobe = vi.fn(() => globe);

vi.mock("cobe", () => ({
  default: (...args) => createGlobe(...args)
}));

describe("EmotionSignalOrb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(17);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(320);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the leading three signals as accessible reference values", () => {
    render(
      <EmotionSignalOrb
        result={{
          scores: [
            { key: "joy", score: 12 },
            { key: "anxiety", score: 42 },
            { key: "neutral", score: 18 },
            { key: "sadness", score: 26 }
          ]
        }}
      />
    );

    const orb = screen.getByRole("img");
    expect(orb).toHaveAccessibleName(/불안 42%/);
    expect(orb).toHaveAccessibleName(/슬픔 26%/);
    expect(orb).toHaveAccessibleName(/중립 18%/);
    expect(orb).not.toHaveAccessibleName(/기쁨 12%/);
    expect(orb).toHaveAccessibleName(/회전할 수 있습니다/);
    expect(createGlobe).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({
        width: 320,
        height: 320,
        markers: expect.arrayContaining([
          expect.objectContaining({ location: [37.5, 127] })
        ])
      })
    );
  });

  it("destroys the globe and animation when the result view unmounts", () => {
    const { unmount } = render(
      <EmotionSignalOrb
        result={{ scores: [{ key: "neutral", score: 100 }] }}
      />
    );

    unmount();

    expect(globe.destroy).toHaveBeenCalledOnce();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(17);
  });
});
