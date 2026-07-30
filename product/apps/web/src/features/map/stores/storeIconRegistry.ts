import type { ExpressionSpecification } from "maplibre-gl";

import type { CategorySemanticGroup } from "../../market/categorySemantics";

export const STORE_CATEGORY_ICON_PREFIX = "localtwin-store-icon-";

const STORE_CATEGORY_GROUPS = [
  "cafe",
  "food",
  "bakery",
  "convenience",
  "flower",
  "beauty",
  "apparel",
  "sports",
  "academy",
  "lodging",
  "generic",
] as const satisfies readonly CategorySemanticGroup[];

const STORE_CATEGORY_PALETTE: Record<
  CategorySemanticGroup,
  { background: string; foreground: string; border: string }
> = {
  cafe: { background: "#fff8e8", foreground: "#008f5a", border: "#00a866" },
  food: { background: "#fff0e7", foreground: "#c7642d", border: "#cd6730" },
  bakery: { background: "#fff7d9", foreground: "#93651d", border: "#bc8427" },
  convenience: { background: "#eaf3ff", foreground: "#315f9e", border: "#3d69a4" },
  flower: { background: "#fff6d3", foreground: "#9f6818", border: "#b77f22" },
  beauty: { background: "#fdeaf1", foreground: "#b94972", border: "#be4e77" },
  apparel: { background: "#f0ebff", foreground: "#6f50b6", border: "#7453bd" },
  sports: { background: "#e5f7f3", foreground: "#117770", border: "#198077" },
  academy: { background: "#e8f5fb", foreground: "#2b7696", border: "#317b9a" },
  lodging: { background: "#f6eaf3", foreground: "#845079", border: "#8b537e" },
  generic: { background: "#eff2f0", foreground: "#606d65", border: "#616d65" },
};

const ICON_WIDTH = 64;
const ICON_HEIGHT = 72;
const ICON_PIXEL_RATIO = 2;

type Rgba = readonly [number, number, number, number];

type StoreStyleImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

type StoreStyleImageTarget = {
  hasImage: (id: string) => boolean;
  addImage: (id: string, image: StoreStyleImage, options?: { pixelRatio?: number }) => void;
};

export type StoreStyleImageEvent = {
  id: string;
  target: StoreStyleImageTarget;
};

export function storeCategoryIconId(group: CategorySemanticGroup) {
  return `${STORE_CATEGORY_ICON_PREFIX}${group}`;
}

export const STORE_CATEGORY_ICON_IMAGE_EXPRESSION: ExpressionSpecification = [
  "match",
  ["get", "categoryGroup"],
  "cafe",
  storeCategoryIconId("cafe"),
  "food",
  storeCategoryIconId("food"),
  "bakery",
  storeCategoryIconId("bakery"),
  "convenience",
  storeCategoryIconId("convenience"),
  "flower",
  storeCategoryIconId("flower"),
  "beauty",
  storeCategoryIconId("beauty"),
  "apparel",
  storeCategoryIconId("apparel"),
  "sports",
  storeCategoryIconId("sports"),
  "academy",
  storeCategoryIconId("academy"),
  "lodging",
  storeCategoryIconId("lodging"),
  storeCategoryIconId("generic"),
];

function hexColor(value: string, alpha = 255): Rgba {
  const hex = value.replace("#", "");
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    alpha,
  ];
}

function blendPixel(data: Uint8Array, x: number, y: number, color: Rgba) {
  if (x < 0 || y < 0 || x >= ICON_WIDTH || y >= ICON_HEIGHT) return;
  const offset = (Math.round(y) * ICON_WIDTH + Math.round(x)) * 4;
  const sourceAlpha = color[3] / 255;
  const targetAlpha = data[offset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  if (outputAlpha <= 0) return;
  data[offset] = Math.round(
    (color[0] * sourceAlpha + data[offset] * targetAlpha * (1 - sourceAlpha)) / outputAlpha,
  );
  data[offset + 1] = Math.round(
    (color[1] * sourceAlpha + data[offset + 1] * targetAlpha * (1 - sourceAlpha)) /
      outputAlpha,
  );
  data[offset + 2] = Math.round(
    (color[2] * sourceAlpha + data[offset + 2] * targetAlpha * (1 - sourceAlpha)) /
      outputAlpha,
  );
  data[offset + 3] = Math.round(outputAlpha * 255);
}

function fillDisk(data: Uint8Array, centerX: number, centerY: number, radius: number, color: Rgba) {
  const minX = Math.floor(centerX - radius);
  const maxX = Math.ceil(centerX + radius);
  const minY = Math.floor(centerY - radius);
  const maxY = Math.ceil(centerY + radius);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (Math.hypot(x - centerX, y - centerY) <= radius) blendPixel(data, x, y, color);
    }
  }
}

function drawLine(
  data: Uint8Array,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: Rgba,
  width = 2.5,
) {
  const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY), 1) * 2;
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    fillDisk(
      data,
      fromX + (toX - fromX) * progress,
      fromY + (toY - fromY) * progress,
      width / 2,
      color,
    );
  }
}

function drawPolyline(data: Uint8Array, points: readonly [number, number][], color: Rgba, width = 2.5) {
  for (let index = 1; index < points.length; index += 1) {
    drawLine(data, points[index - 1][0], points[index - 1][1], points[index][0], points[index][1], color, width);
  }
}

function fillRect(
  data: Uint8Array,
  left: number,
  top: number,
  right: number,
  bottom: number,
  color: Rgba,
) {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) blendPixel(data, x, y, color);
  }
}

function markerShapeContains(x: number, y: number, inset: number, offsetY = 0) {
  const centerX = ICON_WIDTH / 2;
  const centerY = 27 + offsetY;
  const radius = 25 - inset;
  const circle = Math.hypot(x - centerX, y - centerY) <= radius;
  const tailTop = 38 + offsetY;
  const tailBottom = 68 - inset + offsetY;
  const tailProgress = (tailBottom - y) / Math.max(tailBottom - tailTop, 1);
  const tail =
    y >= tailTop &&
    y <= tailBottom &&
    Math.abs(x - centerX) <= Math.max(0.8, (15 - inset) * tailProgress);
  return circle || tail;
}

function fillMarkerShape(data: Uint8Array, inset: number, color: Rgba, offsetY = 0) {
  for (let y = 0; y < ICON_HEIGHT; y += 1) {
    for (let x = 0; x < ICON_WIDTH; x += 1) {
      if (markerShapeContains(x, y, inset, offsetY)) blendPixel(data, x, y, color);
    }
  }
}

function drawCategoryGlyph(data: Uint8Array, group: CategorySemanticGroup, color: Rgba) {
  switch (group) {
    case "cafe":
      drawPolyline(data, [[22, 22], [22, 34], [39, 34], [39, 22], [22, 22]], color, 2.6);
      drawPolyline(data, [[39, 24], [45, 24], [46, 29], [43, 32], [39, 32]], color, 2.6);
      drawLine(data, 20, 38, 44, 38, color, 2.6);
      break;
    case "food":
      drawLine(data, 25, 18, 25, 38, color, 2.6);
      drawLine(data, 21, 18, 21, 25, color, 2.2);
      drawLine(data, 25, 18, 25, 25, color, 2.2);
      drawLine(data, 29, 18, 29, 25, color, 2.2);
      drawLine(data, 21, 25, 29, 25, color, 2.2);
      drawPolyline(data, [[39, 18], [36, 27], [39, 28], [39, 38]], color, 2.8);
      break;
    case "bakery":
      drawLine(data, 27, 39, 38, 17, color, 2.6);
      drawLine(data, 31, 31, 23, 27, color, 2.4);
      drawLine(data, 34, 26, 42, 23, color, 2.4);
      drawLine(data, 28, 36, 21, 33, color, 2.4);
      drawLine(data, 37, 21, 42, 18, color, 2.4);
      break;
    case "convenience":
      drawPolyline(data, [[21, 24], [43, 24], [39, 37], [25, 37], [21, 24]], color, 2.6);
      drawPolyline(data, [[26, 24], [29, 18], [35, 18], [38, 24]], color, 2.6);
      drawLine(data, 28, 28, 27, 34, color, 2);
      drawLine(data, 36, 28, 37, 34, color, 2);
      break;
    case "flower":
      fillDisk(data, 32, 27, 4.2, color);
      fillDisk(data, 32, 18.5, 5, color);
      fillDisk(data, 40, 24, 5, color);
      fillDisk(data, 37, 33, 5, color);
      fillDisk(data, 27, 33, 5, color);
      fillDisk(data, 24, 24, 5, color);
      break;
    case "beauty":
      drawLine(data, 27, 29, 42, 18, color, 2.5);
      drawLine(data, 27, 29, 42, 39, color, 2.5);
      fillDisk(data, 23, 25, 5.2, color);
      fillDisk(data, 23, 34, 5.2, color);
      fillDisk(data, 23, 25, 2.4, [255, 255, 255, 255]);
      fillDisk(data, 23, 34, 2.4, [255, 255, 255, 255]);
      break;
    case "apparel":
      drawPolyline(
        data,
        [[27, 18], [21, 22], [17, 29], [23, 32], [25, 28], [25, 40], [39, 40], [39, 28], [41, 32], [47, 29], [43, 22], [37, 18]],
        color,
        2.6,
      );
      drawPolyline(data, [[27, 18], [29, 23], [35, 23], [37, 18]], color, 2.4);
      break;
    case "sports":
      drawLine(data, 22, 28, 42, 28, color, 3);
      drawLine(data, 20, 22, 20, 34, color, 3.4);
      drawLine(data, 24, 24, 24, 32, color, 3.4);
      drawLine(data, 40, 24, 40, 32, color, 3.4);
      drawLine(data, 44, 22, 44, 34, color, 3.4);
      break;
    case "academy":
      drawPolyline(data, [[18, 24], [32, 17], [46, 24], [32, 31], [18, 24]], color, 2.6);
      drawPolyline(data, [[23, 28], [23, 35], [32, 39], [41, 35], [41, 28]], color, 2.6);
      drawLine(data, 46, 24, 46, 36, color, 2.2);
      break;
    case "lodging":
      drawLine(data, 20, 19, 20, 39, color, 2.8);
      drawLine(data, 44, 27, 44, 39, color, 2.8);
      fillRect(data, 22, 27, 42, 36, color);
      fillRect(data, 23, 22, 30, 27, color);
      drawLine(data, 20, 38, 44, 38, color, 2.8);
      break;
    case "generic":
      drawPolyline(data, [[20, 24], [23, 18], [41, 18], [44, 24]], color, 2.6);
      drawLine(data, 20, 24, 44, 24, color, 2.6);
      drawPolyline(data, [[22, 25], [22, 39], [42, 39], [42, 25]], color, 2.6);
      drawLine(data, 29, 29, 29, 39, color, 2.4);
      drawLine(data, 35, 29, 35, 39, color, 2.4);
      break;
  }
}

export function createStoreCategoryIconImage(group: CategorySemanticGroup): StoreStyleImage {
  const palette = STORE_CATEGORY_PALETTE[group];
  const data = new Uint8Array(ICON_WIDTH * ICON_HEIGHT * 4);
  fillMarkerShape(data, -1, [28, 54, 36, 34], 2);
  fillMarkerShape(data, 0, [255, 255, 255, 238]);
  fillMarkerShape(data, 2, hexColor(palette.border, 232));
  fillMarkerShape(data, 4, hexColor(palette.background, 246));
  fillDisk(data, 27, 18, 10, [255, 255, 255, 88]);
  drawCategoryGlyph(data, group, hexColor(palette.foreground));
  return { width: ICON_WIDTH, height: ICON_HEIGHT, data };
}

function categoryGroupFromImageId(id: string): CategorySemanticGroup | null {
  const group = id.slice(STORE_CATEGORY_ICON_PREFIX.length) as CategorySemanticGroup;
  return STORE_CATEGORY_GROUPS.includes(group) ? group : null;
}

export function addStoreCategoryStyleImage(event: StoreStyleImageEvent) {
  if (!event.id.startsWith(STORE_CATEGORY_ICON_PREFIX)) return false;
  const group = categoryGroupFromImageId(event.id);
  if (!group) return false;
  if (!event.target.hasImage(event.id)) {
    event.target.addImage(event.id, createStoreCategoryIconImage(group), {
      pixelRatio: ICON_PIXEL_RATIO,
    });
  }
  return true;
}
