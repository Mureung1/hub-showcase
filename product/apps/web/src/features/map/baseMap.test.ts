import { describe, expect, it, vi } from "vitest";

import { addMissingStyleImageFallback } from "./baseMap";

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
