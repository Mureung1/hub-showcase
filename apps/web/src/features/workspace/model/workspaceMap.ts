import type { WorkspaceInteraction, WorkspacePoint } from "./workspace.types";

export const WORKSPACE_TILE_SIZE = 32;
export const WORKSPACE_COLUMNS = 43;
export const WORKSPACE_ROWS = 24;
export const WORKSPACE_WIDTH = WORKSPACE_COLUMNS * WORKSPACE_TILE_SIZE;
export const WORKSPACE_HEIGHT = WORKSPACE_ROWS * WORKSPACE_TILE_SIZE;

export type WorkspaceProp = {
  kind: "poppy";
  position: WorkspacePoint;
  variant?: number;
  interactionId?: string;
};

export const workspaceProps: WorkspaceProp[] = [
  { kind: "poppy", position: { x: 690, y: 340 }, variant: 0 },
];

export const workspaceColliders = [
  // Keep only the map boundary. Interior furniture is visual scenery and
  // should not prevent the player from exploring the full workspace.
  { x: WORKSPACE_WIDTH / 2, y: 18, width: WORKSPACE_WIDTH - 32, height: 36 },
  {
    x: WORKSPACE_WIDTH / 2,
    y: WORKSPACE_HEIGHT - 18,
    width: WORKSPACE_WIDTH - 32,
    height: 36,
  },
  { x: 18, y: WORKSPACE_HEIGHT / 2, width: 36, height: WORKSPACE_HEIGHT - 32 },
  {
    x: WORKSPACE_WIDTH - 18,
    y: WORKSPACE_HEIGHT / 2,
    width: 36,
    height: WORKSPACE_HEIGHT - 32,
  },
];

export const workspaceInteractions: WorkspaceInteraction[] = [
  {
    id: "new-analysis",
    kind: "new-analysis",
    label: "새 Repository 분석",
    position: { x: 925, y: 420 },
    activationRadius: 88,
  },
];

export type WorkspaceRepositorySummary = {
  id: string;
  repositoryOwner: string;
  repositoryName: string;
  challengeTitle: string;
  updatedAt: string;
  workspaceSlot?: number | null;
};

// Existing desks on the map act as monitor slots; these are interaction anchors.
export const workspaceRepositoryMonitorSlots: WorkspacePoint[] = [
  { x: 470, y: 270 },
  { x: 370, y: 420 },
  { x: 175, y: 500 },
  { x: 175, y: 690 },
  { x: 930, y: 190 },
  { x: 1190, y: 190 },
  { x: 1010, y: 640 },
  { x: 1260, y: 690 },
];

export function getRepositoryWorkspaceInteractions(
  projects: WorkspaceRepositorySummary[],
): WorkspaceInteraction[] {
  const occupiedSlots = new Set(
    projects
      .map((project) => project.workspaceSlot)
      .filter(isValidWorkspaceSlot),
  );
  const projectsWithSlots = projects.map((project) => {
    const slot = isValidWorkspaceSlot(project.workspaceSlot)
      ? project.workspaceSlot
      : findFirstAvailableWorkspaceSlot(occupiedSlots);

    if (slot !== null) occupiedSlots.add(slot);
    return { project, slot };
  });

  return projectsWithSlots.flatMap(({ project, slot }) => {
    if (slot === null) return [];

    return [
      {
        id: `repository-${project.id}`,
        kind: "repository" as const,
        label: `${project.repositoryName} 다시 보기`,
        position: workspaceRepositoryMonitorSlots[slot],
        activationRadius: 76,
        repositoryId: project.id,
        repositoryOwner: project.repositoryOwner,
        repositoryName: project.repositoryName,
        challengeTitle: project.challengeTitle,
        updatedAt: project.updatedAt,
        workspaceSlot: slot,
      },
    ];
  });
}

function isValidWorkspaceSlot(
  value: number | null | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < workspaceRepositoryMonitorSlots.length
  );
}

function findFirstAvailableWorkspaceSlot(
  occupiedSlots: Set<number>,
): number | null {
  const slot = workspaceRepositoryMonitorSlots.findIndex(
    (_, index) => !occupiedSlots.has(index),
  );
  return slot >= 0 ? slot : null;
}

export function formatWorkspaceRepositoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "날짜 없음";
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function getWorkspaceRepositoryLabel(
  repositoryName: string,
  challengeTitle: string,
): string {
  const truncate = (value: string, maxLength: number) => {
    const characters = Array.from(value.trim());
    return characters.length > maxLength
      ? `${characters.slice(0, maxLength).join("")}…`
      : characters.join("");
  };

  return `${truncate(repositoryName, 20)} · ${truncate(challengeTitle, 14)}`;
}
