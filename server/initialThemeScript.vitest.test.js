import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync("index.html", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");
const initialThemeScript = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];

if (!initialThemeScript) {
  throw new Error("index.html 초기 테마 스크립트를 찾지 못했습니다.");
}

function runInitialTheme({ storedTheme, systemDark, storageError = false }) {
  const root = { dataset: {} };
  const themeColor = { content: "" };
  const context = {
    localStorage: {
      getItem() {
        if (storageError) throw new Error("storage blocked");
        return storedTheme;
      },
    },
    matchMedia() {
      return { matches: systemDark };
    },
    document: {
      documentElement: root,
      querySelector() {
        return themeColor;
      },
    },
  };

  vm.runInNewContext(initialThemeScript, context);
  return { theme: root.dataset.theme, themeColor: themeColor.content };
}

describe("pre-React theme initialization", () => {
  it.each([
    ["saved light", { storedTheme: "light", systemDark: true }, "light", "#f7f8f8"],
    ["saved dark", { storedTheme: "dark", systemDark: false }, "dark", "#101619"],
    ["system light", { storedTheme: "system", systemDark: false }, "light", "#f7f8f8"],
    ["system dark", { storedTheme: "system", systemDark: true }, "dark", "#101619"],
    ["invalid value", { storedTheme: "midnight", systemDark: true }, "dark", "#101619"],
    [
      "blocked storage",
      { storedTheme: null, systemDark: false, storageError: true },
      "light",
      "#f7f8f8",
    ],
  ])("%s applies the expected initial theme", (_name, setup, theme, themeColor) => {
    expect(runInitialTheme(setup)).toEqual({ theme, themeColor });
  });
});

function getThemeBlock(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = globalCss.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`))?.[1];

  if (!block) throw new Error(`${selector} 테마 토큰을 찾지 못했습니다.`);
  return block;
}

function getToken(block, token) {
  const value = block.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

  if (!value) throw new Error(`${token} 색상 토큰을 찾지 못했습니다.`);
  return value;
}

function relativeLuminance(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme color tokens from global.css", () => {
  it.each([
    ["light primary action", ":root", "--color-on-signature", "--color-signature"],
    ["light muted text", ":root", "--color-text-muted", "--color-bg"],
    ["light error", ":root", "--color-danger", "--color-danger-soft"],
    [
      "dark primary action",
      ':root[data-theme="dark"]',
      "--color-on-signature",
      "--color-signature",
    ],
    ["dark muted text", ':root[data-theme="dark"]', "--color-text-muted", "--color-bg"],
    ["dark error", ':root[data-theme="dark"]', "--color-danger", "--color-surface"],
  ])("%s meets WCAG AA contrast", (_name, selector, foregroundToken, backgroundToken) => {
    const block = getThemeBlock(selector);
    const foreground = getToken(block, foregroundToken);
    const background = getToken(block, backgroundToken);

    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
