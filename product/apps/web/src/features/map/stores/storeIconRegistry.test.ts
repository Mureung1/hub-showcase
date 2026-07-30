import { describe, expect, it, vi } from "vitest";

import {
  addStoreCategoryStyleImage,
  createStoreCategoryIconImage,
  storeCategoryIconId,
} from "./storeIconRegistry";

describe("storeIconRegistry", () => {
  it("builds a visible high-density raster icon for every store category", () => {
    const image = createStoreCategoryIconImage("food");
    const visiblePixels = Array.from(image.data).filter(
      (_, index) => index % 4 === 3 && image.data[index] > 0,
    );

    expect(image.width).toBe(64);
    expect(image.height).toBe(72);
    expect(visiblePixels.length).toBeGreaterThan(1000);
  });

  it("registers LocalTwin category images with a retina pixel ratio", () => {
    const addImage = vi.fn();
    const id = storeCategoryIconId("cafe");

    expect(
      addStoreCategoryStyleImage({
        id,
        target: { hasImage: () => false, addImage },
      }),
    ).toBe(true);
    expect(addImage).toHaveBeenCalledOnce();
    expect(addImage).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ width: 64, height: 72 }),
      { pixelRatio: 2 },
    );
  });

  it("leaves unrelated base-map sprite requests to the generic fallback", () => {
    const addImage = vi.fn();

    expect(
      addStoreCategoryStyleImage({
        id: "swimming_pool",
        target: { hasImage: () => false, addImage },
      }),
    ).toBe(false);
    expect(addImage).not.toHaveBeenCalled();
  });
});
