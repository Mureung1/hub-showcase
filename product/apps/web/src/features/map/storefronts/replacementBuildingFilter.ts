import type { ExpressionSpecification } from "maplibre-gl";

import type { SelectedStorefront } from "./SelectedStorefrontLayer";

const DEFAULT_BUILDING_BASE = [
  "to-number",
  ["get", "render_min_height"],
  0,
] as unknown as ExpressionSpecification;
const DEFAULT_BUILDING_HEIGHT = [
  "to-number",
  ["get", "render_height"],
  8,
] as unknown as ExpressionSpecification;

function readyBuildingCenters(stores: SelectedStorefront[]) {
  return stores.flatMap((store) => (store.building ? [store.building.center] : []));
}

function replacementCondition(stores: SelectedStorefront[]): ExpressionSpecification | null {
  const coordinates = readyBuildingCenters(stores);
  if (coordinates.length === 0) return null;
  return [
    "<=",
    [
      "distance",
      {
        type: "MultiPoint",
        coordinates,
      },
    ],
    0.75,
  ] as unknown as ExpressionSpecification;
}

export function replacementBuildingBaseExpression(
  stores: SelectedStorefront[],
): ExpressionSpecification {
  const condition = replacementCondition(stores);
  return condition
    ? (["case", condition, 0, DEFAULT_BUILDING_BASE] as unknown as ExpressionSpecification)
    : DEFAULT_BUILDING_BASE;
}

export function replacementBuildingHeightExpression(
  stores: SelectedStorefront[],
): ExpressionSpecification {
  const condition = replacementCondition(stores);
  return condition
    ? (["case", condition, 0, DEFAULT_BUILDING_HEIGHT] as unknown as ExpressionSpecification)
    : DEFAULT_BUILDING_HEIGHT;
}
