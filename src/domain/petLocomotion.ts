import type { Rect } from "./interactionObjects";

export type PetLayer = "window" | "desktop-overlay";
export type PetMotionCommand = "idle" | "jump" | "pose";

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function canJumpToPlatform(pet: Rect, platform: Rect, threshold = 24): boolean {
  const petCenterX = pet.x + pet.width / 2;
  const platformStart = platform.x - threshold;
  const platformEnd = platform.x + platform.width + threshold;
  const verticalGap = platform.y - (pet.y + pet.height);

  return petCenterX >= platformStart && petCenterX <= platformEnd && Math.abs(verticalGap) <= threshold;
}

export function resolvePetLayer(pet: Rect, escapeEdge: Rect): PetLayer {
  return rectsOverlap(pet, escapeEdge) ? "desktop-overlay" : "window";
}

export function resolveMotionCommand(motion: "climb" | "jump", reducedMotion: boolean): PetMotionCommand {
  if (reducedMotion) return "pose";
  if (motion === "jump") return "jump";
  return "idle";
}
