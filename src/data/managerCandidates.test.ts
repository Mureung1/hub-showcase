import { describe, expect, it } from "vitest";
import { petAnimationCatalog } from "./assetManifest";
import { createInitialManagerState, defaultManagerCandidatePetId, managerCandidates } from "./managerCandidates";

describe("manager candidates", () => {
  it("creates a fresh manager at level 1 for local restart and first setup", () => {
    expect(createInitialManagerState()).toMatchObject({
      petId: defaultManagerCandidatePetId,
      level: 1,
      exp: 0,
      stats: {
        diligence: 0,
        persistence: 0,
        creativity: 0,
        knowledge: 0,
        strength: 0,
        agility: 0,
        stamina: 0,
        charm: 0,
      },
      unlockedStages: ["stage-1"],
      selectedStage: null,
    });
  });

  it("keeps selectable manager candidates backed by the pet animation catalog", () => {
    const seenPetIds = new Set<string>();

    for (const candidate of managerCandidates) {
      expect(candidate.name.length).toBeGreaterThan(0);
      expect(candidate.title.length).toBeGreaterThan(0);
      expect(candidate.description.length).toBeGreaterThan(0);
      expect(petAnimationCatalog[candidate.petId]).toBeDefined();
      expect(seenPetIds.has(candidate.petId)).toBe(false);
      seenPetIds.add(candidate.petId);
    }
  });

  it("lists readable manager choices for the setup selection window", () => {
    expect(managerCandidates.map((candidate) => candidate.petId)).toEqual([
      "pink-manager",
      "glass-frog",
      "planaria",
      "costasiella-kuroshimae",
      "fried-egg-jellyfish",
      "sea-bunny-slug",
    ]);
    expect(managerCandidates[0]).toMatchObject({
      name: "루미",
      title: "분홍 전자 매니저",
    });
    expect(managerCandidates[0].description).toContain("반응");
  });
});
