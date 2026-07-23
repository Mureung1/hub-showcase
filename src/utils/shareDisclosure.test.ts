import { describe, expect, it } from "vitest";
import { sampleAnalysis } from "../data/sampleAnalysis";
import { sanitizeSharedResultForRender } from "./shareDisclosure";

describe("share disclosure rendering boundary", () => {
  it("removes identities, provider data, source titles, quotes, and a hidden project title in summary mode", () => {
    const safe = sanitizeSharedResultForRender(sampleAnalysis, {
      disclosureMode: "summary",
      includeProjectTitle: false,
      projectTitle: sampleAnalysis.projectTitle,
    });
    const serialized = JSON.stringify(safe);

    expect(safe.projectTitle).toBe("공유 프로젝트");
    expect(safe.participants).toEqual([]);
    expect(serialized).not.toMatch(/민지|서준|현우/);
    expect(serialized).not.toContain(sampleAnalysis.projectTitle);
    expect(serialized).not.toMatch(/sourceTitle|sourceRecordId|quote|provider/);
  });

  it("keeps evidence quotes only in the explicitly selected evidence mode", () => {
    const safe = sanitizeSharedResultForRender(sampleAnalysis, {
      disclosureMode: "evidence",
      includeProjectTitle: true,
      projectTitle: sampleAnalysis.projectTitle,
    });

    expect(JSON.stringify(safe)).toMatch(/quote/);
    expect(safe.projectTitle).toBe(sampleAnalysis.projectTitle);
    expect(safe.participants).toEqual([]);
  });
});
