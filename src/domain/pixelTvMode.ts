export type PixelTvMode = "default" | "projection";

export function normalizePixelTvMode(value: unknown): PixelTvMode {
  return value === "projection" ? "projection" : "default";
}

export function togglePixelTvMode(mode: PixelTvMode): PixelTvMode {
  return mode === "projection" ? "default" : "projection";
}

export function resetPixelTvMode(): PixelTvMode {
  return "default";
}
