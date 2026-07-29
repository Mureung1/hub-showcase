export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "swim-theme";
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f7f8f8",
  dark: "#101619",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemePreference(storage: Pick<Storage, "getItem" | "removeItem"> = localStorage) {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
    if (stored !== null) storage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // A private or restricted browser may block storage. System theme remains usable.
  }
  return "system" as const;
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Applying the theme must not depend on storage availability.
  }
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return preference === "system"
    ? prefersDark ? "dark" : "light"
    : preference;
}

export function applyTheme(
  preference: ThemePreference,
  root: HTMLElement = document.documentElement,
  prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
) {
  const resolved = resolveTheme(preference, prefersDark);
  root.dataset.theme = resolved;
  root.ownerDocument
    ?.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[resolved]);
  return resolved;
}
