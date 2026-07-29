export type RuntimeFallbackArea = "stats" | "behavior" | "sound" | "assets";

export interface RuntimeFallback {
  id: string;
  area: RuntimeFallbackArea;
  runtimeStatus: "active" | "guarded" | "documented";
  sourcePath: string;
  reason: string;
}

export const runtimeFallbacks: RuntimeFallback[] = [
  {
    id: "stat-evaluation-rule-fallback",
    area: "stats",
    runtimeStatus: "active",
    sourcePath: "src/App.tsx:createQuestEventRequest",
    reason: "LLM stat distribution is not connected; runtime stores validated rule_fallback stat metadata.",
  },
  {
    id: "manager-behavior-rule-fallback",
    area: "behavior",
    runtimeStatus: "active",
    sourcePath: "src/App.tsx:createRuleFallbackManagerIntent",
    reason: "LLM manager intent is not connected; runtime derives limited behavior bias from local manager state.",
  },
  {
    id: "cyber-purr-placeholder-sound",
    area: "sound",
    runtimeStatus: "guarded",
    sourcePath: "src/data/assetManifest.ts:soundAssets",
    reason: "The cyber-purr sound slot is a placeholder and is excluded from playback while the real asset is missing.",
  },
  {
    id: "stage-asset-motion-fallback",
    area: "assets",
    runtimeStatus: "documented",
    sourcePath: "src/data/assetManifest.ts:getLumiAnimationAsset",
    reason: "Some pet stages intentionally fall back to available Stage 1/2 motion sheets until later stage assets exist.",
  },
];

export function getRuntimeFallbacksByArea(area: RuntimeFallbackArea) {
  return runtimeFallbacks.filter((fallback) => fallback.area === area);
}
