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
  0.24,
  "rgba(59, 130, 246, 0.18)",
  0.48,
  "rgba(59, 130, 246, 0.42)",
  0.72,
  "rgba(245, 158, 11, 0.6)",
  0.9,
  "rgba(239, 68, 68, 0.72)",
  1,
  "rgba(185, 28, 28, 0.82)",
];
