import type { SpriteAnchor } from "./assetManifest";

export interface SpriteFrameBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpriteSheetGeometryRecommendation {
  recommendedAnchor: SpriteAnchor;
  protrusion: {
    left: number;
    right: number;
  };
  averageBox: SpriteFrameBox;
  peekSide: "left" | "right" | null;
}

export interface RgbaSpriteSheetInput {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export function recommendSpriteAnchorFromFrameBoxes(
  frameBoxes: readonly SpriteFrameBox[],
  frameWidth: number,
  _frameHeight: number,
  anchorType: SpriteAnchor["type"],
): SpriteSheetGeometryRecommendation {
  const averageBox = averageFrameBox(frameBoxes);
  const left = Math.min(...frameBoxes.map((box) => box.minX));
  const right = Math.min(...frameBoxes.map((box) => frameWidth - 1 - box.maxX));
  const centerX = Math.round((averageBox.minX + averageBox.maxX) / 2);
  const centerY = Math.round((averageBox.minY + averageBox.maxY) / 2);

  if (anchorType === "top-grip") {
    return {
      recommendedAnchor: { type: "top-grip", x: centerX, y: Math.round(averageBox.minY) },
      protrusion: { left, right },
      averageBox,
      peekSide: null,
    };
  }

  if (anchorType === "peek-edge") {
    const peekSide = left <= right ? "left" : "right";
    return {
      recommendedAnchor: { type: "peek-edge", x: peekSide === "left" ? left : frameWidth - 1 - right, y: centerY },
      protrusion: { left, right },
      averageBox,
      peekSide,
    };
  }

  return {
    recommendedAnchor: { type: "float", x: centerX, y: Math.round(averageBox.maxY) },
    protrusion: { left, right },
    averageBox,
    peekSide: null,
  };
}

export function measureSpriteSheetGeometryFromRgba(
  input: RgbaSpriteSheetInput,
  anchorType: SpriteAnchor["type"],
): SpriteSheetGeometryRecommendation | null {
  const frameBoxes = measureSpriteFrameBoxes(input);
  if (frameBoxes.length === 0) return null;
  return recommendSpriteAnchorFromFrameBoxes(frameBoxes, input.frameWidth, input.frameHeight, anchorType);
}

export function measureSpriteFrameBoxes(input: RgbaSpriteSheetInput): SpriteFrameBox[] {
  const frameBoxes: SpriteFrameBox[] = [];

  for (let frame = 0; frame < input.frameCount; frame += 1) {
    let minX = input.frameWidth;
    let minY = input.frameHeight;
    let maxX = -1;
    let maxY = -1;
    const startX = frame * input.frameWidth;

    for (let y = 0; y < input.frameHeight; y += 1) {
      for (let x = 0; x < input.frameWidth; x += 1) {
        const alpha = input.data[((y * input.width + startX + x) * 4) + 3];
        if (alpha === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX >= 0) frameBoxes.push({ minX, minY, maxX, maxY });
  }

  return frameBoxes;
}

function averageFrameBox(frameBoxes: readonly SpriteFrameBox[]): SpriteFrameBox {
  const totals = frameBoxes.reduce(
    (sum, box) => ({
      minX: sum.minX + box.minX,
      minY: sum.minY + box.minY,
      maxX: sum.maxX + box.maxX,
      maxY: sum.maxY + box.maxY,
    }),
    { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  );
  const count = frameBoxes.length;

  return {
    minX: Math.round(totals.minX / count),
    minY: Math.round(totals.minY / count),
    maxX: Math.round(totals.maxX / count),
    maxY: Math.round(totals.maxY / count),
  };
}
