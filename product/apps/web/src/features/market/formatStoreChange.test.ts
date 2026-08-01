import { describe, expect, it } from "vitest";

import { formatStoreChange } from "./formatStoreChange";

describe("formatStoreChange", () => {
  it("uses explicit increase, decrease, and no-change labels", () => {
    expect(formatStoreChange(23, "곳")).toBe("23곳 증가");
    expect(formatStoreChange(-23, "곳")).toBe("23곳 감소");
    expect(formatStoreChange(0, "곳")).toBe("변화 없음");
    expect(formatStoreChange(null, "곳")).toBe("자료 없음");
  });
});
