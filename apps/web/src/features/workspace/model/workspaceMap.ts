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
  { x: WORKSPACE_WIDTH / 2, y: 18, width: WORKSPACE_WIDTH - 32, height: 36 },
  { x: WORKSPACE_WIDTH / 2, y: WORKSPACE_HEIGHT - 18, width: WORKSPACE_WIDTH - 32, height: 36 },
  { x: 18, y: WORKSPACE_HEIGHT / 2, width: 36, height: WORKSPACE_HEIGHT - 32 },
  { x: WORKSPACE_WIDTH - 18, y: WORKSPACE_HEIGHT / 2, width: 36, height: WORKSPACE_HEIGHT - 32 },
  { x: 285, y: 165, width: 160, height: 88 },
  { x: 410, y: 165, width: 150, height: 88 },
  { x: 285, y: 382, width: 170, height: 90 },
  { x: 285, y: 585, width: 170, height: 90 },
  { x: 970, y: 190, width: 210, height: 100 },
  { x: 1_190, y: 500, width: 150, height: 145 },
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
