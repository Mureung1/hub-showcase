export type WorkspacePoint = {
  x: number;
  y: number;
};

export type WorkspaceInteraction =
  | {
      id: string;
      kind: "new-analysis";
      label: string;
      position: WorkspacePoint;
      activationRadius: number;
    }
  | {
      id: string;
      kind: "repository";
      label: string;
      position: WorkspacePoint;
      activationRadius: number;
      repositoryId: string;
      repositoryOwner?: string;
      repositoryName?: string;
      challengeTitle?: string;
      updatedAt?: string;
      workspaceSlot?: number | null;
    };

export type WorkspaceEvent =
  | {
      type: "interaction-changed";
      interaction: WorkspaceInteraction | null;
    }
  | {
      type: "open-new-analysis";
    }
  | {
      type: "open-repository";
      repositoryId: string;
    };

export type WorkspaceEventListener = (event: WorkspaceEvent) => void;

export type WorkspaceGameHandle = {
  destroy: () => void;
  focus: () => void;
  setInputEnabled: (isEnabled: boolean) => void;
  setRepositoryInteractions: (interactions: WorkspaceInteraction[]) => void;
};
