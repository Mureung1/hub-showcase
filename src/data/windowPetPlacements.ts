export type WindowPetAttachSide = "bottom" | "left" | "right" | "top";
export type WindowPetMotion = "hanging" | "hiding" | "climbing" | "jump";
export type WindowPetLayer = "front" | "behind-window";

export interface WindowPetPlacementDraft {
  offsetX: number;
  offsetY: number;
  scale: number;
  edge: WindowPetAttachSide;
  mirrorX: boolean;
  layer: WindowPetLayer;
}

export interface WindowPetPositionInput {
  placement: WindowPetPlacementDraft;
  windowPosition: {
    x: number;
    y: number;
  };
  windowSize: {
    width: number;
    height: number;
  };
  frameWidth: number;
  anchor: {
    x: number;
    y: number;
  };
  baseSpriteSize: number;
}

export type WindowPetPlacementDraftsByMotion = Record<WindowPetMotion, Record<WindowPetAttachSide, WindowPetPlacementDraft>>;

export interface WindowPetRuntimeSlot {
  motion: WindowPetMotion;
  edge: WindowPetAttachSide;
  windowSize: {
    width: number;
    height: number;
  };
}

export const windowPetPlacementStorageKey = "manager-xp.window-pet-placement.v1";

export const defaultWindowPetPlacementDrafts: WindowPetPlacementDraftsByMotion = {
  hanging: {
    bottom: placement("bottom", 0, -8),
    left: placement("left", -6, 0),
    right: placement("right", 6, 0, 1, true),
    top: placement("top", 0, 8),
  },
  hiding: {
    bottom: placement("bottom", 0, 8, 1, false, "behind-window"),
    left: placement("left", -6, 0, 1, false, "behind-window"),
    right: placement("right", 6, 0, 1, true, "behind-window"),
    top: placement("top", 0, -8, 1, false, "behind-window"),
  },
  climbing: {
    bottom: placement("bottom", 0, -8),
    left: placement("left", -4, 0),
    right: placement("right", 4, 0, 1, true),
    top: placement("top", 0, 8),
  },
  jump: {
    bottom: placement("bottom", 0, -16),
    left: placement("left", -10, -8),
    right: placement("right", 10, -8, 1, true),
    top: placement("top", 0, 12),
  },
};

export const runtimeWindowPetSlots = {
  "below-quest": {
    motion: "hanging",
    edge: "bottom",
    windowSize: { width: 360, height: 367.5 },
  },
  "beside-recovery": {
    motion: "hiding",
    edge: "left",
    windowSize: { width: 390, height: 190 },
  },
} as const satisfies Record<"below-quest" | "beside-recovery", WindowPetRuntimeSlot>;

export function resolveWindowPetPosition(input: WindowPetPositionInput) {
  const scale = (input.baseSpriteSize / input.frameWidth) * input.placement.scale;
  const edgePoint = getWindowEdgePoint(input.windowSize, input.placement.edge);
  const anchorX = (input.placement.mirrorX ? input.frameWidth - input.anchor.x : input.anchor.x) * scale;
  const anchorY = input.anchor.y * scale;

  return {
    left: Math.round(input.windowPosition.x + edgePoint.x + input.placement.offsetX - anchorX),
    top: Math.round(input.windowPosition.y + edgePoint.y + input.placement.offsetY - anchorY),
    size: Math.round(input.baseSpriteSize * input.placement.scale),
    layer: input.placement.layer,
  };
}

export function readWindowPetPlacementDrafts(getItem: (key: string) => string | null): WindowPetPlacementDraftsByMotion {
  const rawValue = getItem(windowPetPlacementStorageKey);
  if (!rawValue) return defaultWindowPetPlacementDrafts;

  try {
    return normalizePlacementDrafts(JSON.parse(rawValue));
  } catch {
    return defaultWindowPetPlacementDrafts;
  }
}

export function normalizePlacementDrafts(value: unknown): WindowPetPlacementDraftsByMotion {
  if (!isRecord(value)) return defaultWindowPetPlacementDrafts;

  return {
    hanging: normalizeMotionPlacements(value.hanging, defaultWindowPetPlacementDrafts.hanging),
    hiding: normalizeMotionPlacements(value.hiding, defaultWindowPetPlacementDrafts.hiding),
    climbing: normalizeMotionPlacements(value.climbing, defaultWindowPetPlacementDrafts.climbing),
    jump: normalizeMotionPlacements(value.jump, defaultWindowPetPlacementDrafts.jump),
  };
}

export function placement(
  edge: WindowPetAttachSide,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  mirrorX = false,
  layer: WindowPetLayer = "front",
): WindowPetPlacementDraft {
  return { edge, offsetX, offsetY, scale, mirrorX, layer };
}

function normalizeMotionPlacements(value: unknown, fallback: Record<WindowPetAttachSide, WindowPetPlacementDraft>) {
  if (!isRecord(value)) return fallback;

  return {
    bottom: normalizePlacement(value.bottom, fallback.bottom),
    left: normalizePlacement(value.left, fallback.left),
    right: normalizePlacement(value.right, fallback.right),
    top: normalizePlacement(value.top, fallback.top),
  };
}

function normalizePlacement(value: unknown, fallback: WindowPetPlacementDraft): WindowPetPlacementDraft {
  if (!isRecord(value)) return fallback;

  return {
    offsetX: typeof value.offsetX === "number" ? value.offsetX : fallback.offsetX,
    offsetY: typeof value.offsetY === "number" ? value.offsetY : fallback.offsetY,
    scale: typeof value.scale === "number" && value.scale > 0 ? value.scale : fallback.scale,
    edge: isAttachSide(value.edge) ? value.edge : fallback.edge,
    mirrorX: typeof value.mirrorX === "boolean" ? value.mirrorX : fallback.mirrorX,
    layer: isLayer(value.layer) ? value.layer : fallback.layer,
  };
}

function getWindowEdgePoint(windowSize: WindowPetPositionInput["windowSize"], edge: WindowPetAttachSide) {
  if (edge === "top") return { x: windowSize.width / 2, y: 0 };
  if (edge === "left") return { x: 0, y: windowSize.height / 2 };
  if (edge === "right") return { x: windowSize.width, y: windowSize.height / 2 };
  return { x: windowSize.width / 2, y: windowSize.height };
}

function isAttachSide(value: unknown): value is WindowPetAttachSide {
  return value === "bottom" || value === "left" || value === "right" || value === "top";
}

function isLayer(value: unknown): value is WindowPetLayer {
  return value === "front" || value === "behind-window";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
