import type {
  WorkspaceInteraction,
  WorkspacePoint,
} from "../model/workspace.types";

function getDistance(first: WorkspacePoint, second: WorkspacePoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function findNearestInteraction(
  playerPosition: WorkspacePoint,
  interactions: WorkspaceInteraction[],
): WorkspaceInteraction | null {
  let nearest: WorkspaceInteraction | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const interaction of interactions) {
    const distance = getDistance(playerPosition, interaction.position);

    if (distance <= interaction.activationRadius && distance < nearestDistance) {
      nearest = interaction;
      nearestDistance = distance;
    }
  }

  return nearest;
}
