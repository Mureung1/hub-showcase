import { useEffect, useState } from "react";
import { normalizePixelTvMode, resetPixelTvMode, togglePixelTvMode, type PixelTvMode } from "../domain/pixelTvMode";

export const pixelTvModeKey = "manager-xp.pixel-tv-mode.v1";

export function usePixelTvMode() {
  const [pixelTvMode, setPixelTvMode] = useState<PixelTvMode>(() => readStoredPixelTvMode());

  useEffect(() => {
    window.localStorage.setItem(pixelTvModeKey, JSON.stringify(pixelTvMode));
  }, [pixelTvMode]);

  return {
    pixelTvMode,
    pixelTvConnected: pixelTvMode === "projection",
    togglePixelTvMode: () => setPixelTvMode((current) => togglePixelTvMode(current)),
    resetPixelTvMode: () => setPixelTvMode(resetPixelTvMode()),
  };
}

function readStoredPixelTvMode(): PixelTvMode {
  try {
    const rawValue = window.localStorage.getItem(pixelTvModeKey);
    return normalizePixelTvMode(rawValue ? JSON.parse(rawValue) : null);
  } catch {
    return "default";
  }
}
