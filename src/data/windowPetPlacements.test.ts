import { describe, expect, it } from "vitest";
import {
  defaultWindowPetPlacementDrafts,
  getRuntimeWindowPetPlacementProfileId,
  readWindowPetPlacementProfile,
  resolveWindowPetLayerZIndex,
  readWindowPetPlacementDrafts,
  resolveWindowPetPlacementForSlot,
  resolveWindowPetPosition,
  runtimeWindowPetSlots,
  windowPetPlacementStorageKey,
  windowPetPlacementStorageKeyV2,
  writeWindowPetPlacementProfile,
  writeWindowPetPlacementDrafts,
  type WindowPetPlacementDraft,
} from "./windowPetPlacements";

describe("window pet placements", () => {
  it("uses the same anchor math for review and runtime placement", () => {
    const placement: WindowPetPlacementDraft = {
      offsetX: 0,
      offsetY: -309,
      scale: 1,
      edge: "bottom",
      mirrorX: false,
      layer: "behind-window",
    };

    const result = resolveWindowPetPosition({
      placement,
      windowPosition: { x: 190, y: 118 },
      windowSize: { width: 360, height: 367.5 },
      frameWidth: 64,
      anchor: { x: 32, y: 5 },
      baseSpriteSize: 96,
    });

    expect(result.left).toBe(322);
    expect(result.top).toBe(169);
    expect(result.size).toBe(96);
    expect(result.layer).toBe("behind-window");
  });

  it("uses pet and stage scoped runtime placement profile ids", () => {
    expect(getRuntimeWindowPetPlacementProfileId("pink-manager", "stage-2")).toBe("runtime:pink-manager:stage-2:canonical");
    expect(getRuntimeWindowPetPlacementProfileId("glass-frog", "stage-2")).toBe("runtime:glass-frog:stage-2:canonical");
  });

  it("reads v2 placement profiles without mixing managers", () => {
    const pinkPlacements = {
      ...defaultWindowPetPlacementDrafts,
      hanging: {
        ...defaultWindowPetPlacementDrafts.hanging,
        top: { ...defaultWindowPetPlacementDrafts.hanging.top, offsetY: 42 },
      },
    };
    const storage = new Map<string, string>([
      [
        windowPetPlacementStorageKeyV2,
        JSON.stringify({
          version: 2,
          profiles: {
            "runtime:pink-manager:stage-2:canonical": pinkPlacements,
          },
        }),
      ],
    ]);

    expect(readWindowPetPlacementDrafts((key) => storage.get(key) ?? null, "runtime:pink-manager:stage-2:canonical").hanging.top.offsetY).toBe(42);
    expect(readWindowPetPlacementDrafts((key) => storage.get(key) ?? null, "runtime:glass-frog:stage-2:canonical").hanging.top.offsetY).toBe(
      defaultWindowPetPlacementDrafts.hanging.top.offsetY,
    );
  });

  it("migrates legacy v1 placement into the requested v2 profile", () => {
    const legacyPlacements = {
      ...defaultWindowPetPlacementDrafts,
      hiding: {
        ...defaultWindowPetPlacementDrafts.hiding,
        left: { ...defaultWindowPetPlacementDrafts.hiding.left, offsetX: -33 },
      },
    };
    const storage = new Map<string, string>([
      [windowPetPlacementStorageKey, JSON.stringify(legacyPlacements)],
    ]);

    expect(readWindowPetPlacementDrafts((key) => storage.get(key) ?? null, "runtime:pink-manager:stage-2:canonical").hiding.left.offsetX).toBe(-33);
  });

  it("writes a single v2 placement profile while preserving other profiles", () => {
    const storage = new Map<string, string>([
      [
        windowPetPlacementStorageKeyV2,
        JSON.stringify({
          version: 2,
          profiles: {
            "runtime:glass-frog:stage-2:canonical": defaultWindowPetPlacementDrafts,
          },
        }),
      ],
    ]);
    const pinkPlacements = {
      ...defaultWindowPetPlacementDrafts,
      jump: {
        ...defaultWindowPetPlacementDrafts.jump,
        bottom: { ...defaultWindowPetPlacementDrafts.jump.bottom, offsetY: -44 },
      },
    };

    writeWindowPetPlacementDrafts(
      (key) => storage.get(key) ?? null,
      (key, value) => storage.set(key, value),
      "runtime:pink-manager:stage-2:canonical",
      pinkPlacements,
    );

    const saved = JSON.parse(storage.get(windowPetPlacementStorageKeyV2) ?? "");
    expect(saved.profiles["runtime:pink-manager:stage-2:canonical"].drafts.jump.bottom.offsetY).toBe(-44);
    expect(saved.profiles["runtime:pink-manager:stage-2:canonical"].activeEdges.hanging).toBe("top");
    expect(saved.profiles["runtime:glass-frog:stage-2:canonical"]).toBeDefined();
  });

  it("persists the active edge per motion in a v2 placement profile", () => {
    const storage = new Map<string, string>();
    const profile = {
      activeEdges: {
        hanging: "bottom",
        hiding: "right",
        climbing: "left",
        jump: "top",
      },
      drafts: {
        ...defaultWindowPetPlacementDrafts,
        hanging: {
          ...defaultWindowPetPlacementDrafts.hanging,
          bottom: { ...defaultWindowPetPlacementDrafts.hanging.bottom, offsetY: -77 },
        },
      },
    } as const;

    writeWindowPetPlacementProfile(
      (key) => storage.get(key) ?? null,
      (key, value) => storage.set(key, value),
      "runtime:pink-manager:stage-2:canonical",
      profile,
    );

    const savedProfile = readWindowPetPlacementProfile(
      (key) => storage.get(key) ?? null,
      "runtime:pink-manager:stage-2:canonical",
    );

    expect(savedProfile.activeEdges.hanging).toBe("bottom");
    expect(savedProfile.activeEdges.hiding).toBe("right");
    expect(savedProfile.drafts.hanging.bottom.offsetY).toBe(-77);
  });

  it("resolves runtime placement from the saved active edge before the fixed runtime slot edge", () => {
    const profile = {
      activeEdges: {
        hanging: "bottom",
        hiding: "left",
        climbing: "top",
        jump: "bottom",
      },
      drafts: {
        ...defaultWindowPetPlacementDrafts,
        hanging: {
          ...defaultWindowPetPlacementDrafts.hanging,
          top: { ...defaultWindowPetPlacementDrafts.hanging.top, offsetY: 11 },
          bottom: { ...defaultWindowPetPlacementDrafts.hanging.bottom, offsetY: -77 },
        },
      },
    } as const;

    const selectedPlacement = resolveWindowPetPlacementForSlot(profile, runtimeWindowPetSlots["below-quest"]);

    expect(runtimeWindowPetSlots["below-quest"].edge).toBe("top");
    expect(selectedPlacement.edge).toBe("bottom");
    expect(selectedPlacement.offsetY).toBe(-77);
  });

  it("keeps front window pets above the active window z-index", () => {
    expect(resolveWindowPetLayerZIndex(42, "front")).toBe(43);
    expect(resolveWindowPetLayerZIndex(42, "behind-window")).toBe(41);
  });
});
