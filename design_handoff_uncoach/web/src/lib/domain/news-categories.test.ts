import { describe, it, expect } from "vitest";
import { NEWS_CATEGORIES } from "./news-categories";

describe("NEWS_CATEGORIES", () => {
  it("5개, key 유일성, label·query 존재", () => {
    expect(NEWS_CATEGORIES).toHaveLength(5);
    const keys = NEWS_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of NEWS_CATEGORIES) {
      expect(c.label).toBeTruthy();
      expect(c.query).toBeTruthy();
    }
  });
});
