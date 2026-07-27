import type { ExpressionSpecification } from "maplibre-gl";

export const DENSITY_COLORS = {
  low: "#3b82f6",
  medium: "#f59e0b",
  high: "#ef4444",
  peak: "#b91c1c",
} as const;

export const DENSITY_HEATMAP_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(59, 130, 246, 0)",
  0.2,
  DENSITY_COLORS.low,
  0.52,
  DENSITY_COLORS.medium,
  0.78,
  DENSITY_COLORS.high,
  1,
  DENSITY_COLORS.peak,
];
