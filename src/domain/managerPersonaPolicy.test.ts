import { describe, expect, it } from "vitest";
import { getPersonaLine, resolveManagerPersona } from "./managerPersonaPolicy";

describe("manager persona policy", () => {
  it("uses persona mainly for wording and feedback style", () => {
    const gentle = resolveManagerPersona({ petId: "pink-manager", tone: "calm", questStyle: "tiny" });
    const direct = resolveManagerPersona({ petId: "pink-manager", tone: "firm", questStyle: "tiny" });

    expect(gentle.feedbackStyle).toBe("gentle");
    expect(direct.feedbackStyle).toBe("direct");
    expect(getPersonaLine("quest_failed", gentle)).not.toBe(getPersonaLine("quest_failed", direct));
  });

  it("keeps animation persona as a weak behavior style bias", () => {
    expect(resolveManagerPersona({ petId: "pink-manager", tone: "friendly", questStyle: "balanced" }).behaviorStyle).toBe("balanced");
    expect(resolveManagerPersona({ petId: "glass-frog", tone: "friendly", questStyle: "balanced" }).behaviorStyle).toBe("adventurous");
    expect(resolveManagerPersona({ petId: "planaria", tone: "friendly", questStyle: "balanced" }).behaviorStyle).toBe("shy");
  });
});
