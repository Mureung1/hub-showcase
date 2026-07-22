import { CanvasSpriteAnimator } from "./CanvasSpriteAnimator";
import {
  defaultLumiPetId,
  fallbackLumiStage,
  getLumiAnimationAsset,
  projectionModeAssets,
} from "../data/assetManifest";

const singlePlanePepperMode = projectionModeAssets.find((asset) => asset.mode === "single_plane_pepper");

export function ProjectionMode() {
  const animation = getLumiAnimationAsset("idle", defaultLumiPetId, fallbackLumiStage);

  function exitProjectionMode() {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("projection");
    window.location.href = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  }

  return (
    <main className="projection-mode" aria-label="Single-plane Pepper projection mode">
      <div className="projection-output" aria-hidden="true">
        <div className="projection-sprite-wrap" data-glow={singlePlanePepperMode?.glowStrength ?? "high"}>
          <CanvasSpriteAnimator animation={animation} ariaLabel="projection Lumi" forceMotion />
        </div>
      </div>
      <div className="projection-controls">
        <button type="button" onClick={exitProjectionMode}>Exit</button>
        <span>Black background · single-plane reflection</span>
      </div>
    </main>
  );
}
