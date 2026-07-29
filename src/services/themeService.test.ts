import { describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_COLORS,
  THEME_STORAGE_KEY,
} from "./themeService";

describe("themeService", () => {
  it("reads valid preferences and repairs an invalid stored value", () => {
    expect(readThemePreference({
      getItem: () => "dark",
      removeItem: vi.fn(),
    })).toBe("dark");

    const removeItem = vi.fn();
    expect(readThemePreference({
      getItem: () => "midnight",
      removeItem,
    })).toBe("system");
    expect(removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
  });

  it("keeps system theme usable when storage access fails", () => {
    expect(readThemePreference({
      getItem: () => { throw new Error("blocked"); },
      removeItem: vi.fn(),
    })).toBe("system");
    expect(() => saveThemePreference("dark", {
      setItem: () => { throw new Error("blocked"); },
    })).not.toThrow();
  });

  it("resolves and applies a single document theme", () => {
    const testDocument = document.implementation.createHTMLDocument();
    const themeColor = testDocument.createElement("meta");
    themeColor.name = "theme-color";
    testDocument.head.append(themeColor);
    const root = testDocument.documentElement;

    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(applyTheme("dark", root, false)).toBe("dark");
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(themeColor.getAttribute("content")).toBe(THEME_COLORS.dark);
  });
});
