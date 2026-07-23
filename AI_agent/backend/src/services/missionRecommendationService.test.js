import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getRecommendedMissions,
  inferCareerTrack,
} from "./missionRecommendationService.js";

describe("mission recommendations", () => {
  it("infers an IT track from major, role, and skills", () => {
    assert.equal(
      inferCareerTrack({
        major: "컴퓨터공학과",
        targetRole: "백엔드 개발자",
        skills: "React, API, DB",
      }),
      "it"
    );
  });

  it("recommends missions for a matching target role", () => {
    const result = getRecommendedMissions({
      major: "컴퓨터공학과",
      targetRole: "백엔드 개발자",
      skills: "React, API, DB",
    });

    assert.equal(result.inferredTrack, "it");
    assert.ok(result.missions.length > 0);
    assert.equal(result.missions[0].id, "it-service-mvp");
  });
});
