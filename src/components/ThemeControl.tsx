import { useEffect, useState } from "react";
import {
  applyTheme,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "../services/themeService";

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "system", label: "시스템" },
];

export function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const updateTheme = () => applyTheme(preference, document.documentElement, media?.matches ?? false);
    updateTheme();

    if (preference !== "system" || !media) return;
    if (media.addEventListener) {
      media.addEventListener("change", updateTheme);
      return () => media.removeEventListener("change", updateTheme);
    }

    media.addListener?.(updateTheme);
    return () => media.removeListener?.(updateTheme);
  }, [preference]);

  const selectTheme = (nextPreference: ThemePreference) => {
    setPreference(nextPreference);
    saveThemePreference(nextPreference);
  };

  return (
    <fieldset className="theme-control" aria-label="화면 테마">
      <legend>화면 테마</legend>
      {themeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={`${option.label} 테마`}
          aria-pressed={preference === option.value}
          onClick={() => selectTheme(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
