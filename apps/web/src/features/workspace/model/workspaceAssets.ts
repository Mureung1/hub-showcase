const workspaceAssetBase = `${import.meta.env.BASE_URL}assets/workspace2/`;

export const workspaceAssets = {
  map: `${workspaceAssetBase}wide_map.png`,
  tileset: `${workspaceAssetBase}art-tileset.png`,
  furniture: `${workspaceAssetBase}furniture.png`,
  player: `${workspaceAssetBase}man.png`,
  poppy: `${workspaceAssetBase}poppy.png`,
  alternatePlayer: `${workspaceAssetBase}man.png`,
} as const;

export const workspaceAssetKeys = {
  map: "workspace-map",
  tileset: "workspace-tileset",
  furniture: "workspace-furniture",
  playerSource: "workspace-player-source",
  player: "workspace-player",
  poppySource: "workspace-poppy-source",
  poppy: "workspace-poppy",
} as const;

export const workspaceSpriteSheet = {
  frameSize: 256,
  columns: 4,
  playerRows: 4,
  poppyRows: 3,
  displayScale: 0.3,
} as const;
