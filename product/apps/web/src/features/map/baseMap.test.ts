import { describe, expect, it, vi } from "vitest";

import { addMissingStyleImageFallback, hideExternalBuildingLayers } from "./baseMap";

describe("addMissingStyleImageFallback", () => {
  it("adds a neutral fallback once for a missing external sprite", () => {
    const addImage = vi.fn();
    const target = { hasImage: vi.fn().mockReturnValue(false), addImage };

    addMissingStyleImageFallback({ id: "gate", target });

    expect(addImage).toHaveBeenCalledOnce();
    expect(addImage.mock.calls[0]?.[0]).toBe("gate");
    expect(addImage.mock.calls[0]?.[1].data).toHaveLength(12 * 12 * 4);
  });

  it("does not replace an image already registered by the style", () => {
    const addImage = vi.fn();
    addMissingStyleImageFallback({
      id: "office",
      target: { hasImage: vi.fn().mockReturnValue(true), addImage },
    });
    expect(addImage).not.toHaveBeenCalled();
  });
});

describe("hideExternalBuildingLayers", () => {
  it("hides both external building footprints and extrusions", () => {
    const setLayoutProperty = vi.fn();
    const map = {
      getLayer: vi.fn((layerId: string) =>
        ["building", "building-3d"].includes(layerId) ? { id: layerId } : undefined,
      ),
      setLayoutProperty,
    };

    hideExternalBuildingLayers(map as never);

    expect(setLayoutProperty).toHaveBeenCalledWith("building", "visibility", "none");
    expect(setLayoutProperty).toHaveBeenCalledWith("building-3d", "visibility", "none");
  });

  it("does nothing when the external style has no building extrusion", () => {
    const setLayoutProperty = vi.fn();
    const map = { getLayer: vi.fn(() => undefined), setLayoutProperty };

    hideExternalBuildingLayers(map as never);

    expect(setLayoutProperty).not.toHaveBeenCalled();
  });
});
