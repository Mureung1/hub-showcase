export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type InteractionObjectType = "ladder" | "platform" | "window_escape_edge";
export type ResizeAxis = "vertical" | "horizontal" | "none";

export interface InteractionObject {
  id: string;
  type: InteractionObjectType;
  rect: Rect;
  resizeAxis: ResizeAxis;
}

export function resizeInteractionObject(object: InteractionObject, nextRect: Rect): InteractionObject {
  if (object.resizeAxis === "vertical") {
    return { ...object, rect: { ...nextRect, width: object.rect.width } };
  }

  if (object.resizeAxis === "horizontal") {
    return { ...object, rect: { ...nextRect, height: object.rect.height } };
  }

  return { ...object, rect: object.rect };
}

export function getClimbPosition(ladder: Rect, progress: number): { x: number; y: number } {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return {
    x: ladder.x + ladder.width / 2,
    y: ladder.y + ladder.height * clampedProgress,
  };
}
