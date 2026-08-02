import { useEffect, useRef, useState } from "react";

import type { SceneCrowdPosition } from "../features/scene/sceneObservations";
import {
  createCrowdOverlay,
  createSplatRuntime,
  frameSplats,
  writeSplatDiagnostics,
} from "./splatViewerRuntime";

type SplatViewerProps = {
  assetUrl: string;
  crowdPositions?: readonly SceneCrowdPosition[];
  filterScaleOutliers?: boolean;
  initialCamera?: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  } | null;
  lod?: boolean;
};

export function SplatViewer({
  assetUrl,
  crowdPositions = [],
  filterScaleOutliers = false,
  initialCamera = null,
  lod = false,
}: SplatViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const crowdPositionsRef = useRef(crowdPositions);
  const updateCrowdRef = useRef<((positions: readonly SceneCrowdPosition[]) => void) | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    crowdPositionsRef.current = crowdPositions;
    updateCrowdRef.current?.(crowdPositions);
  }, [crowdPositions]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const canvasHost = canvasHostRef.current;
    if (!viewer || !canvasHost) return;
    let disposed = false;
    let disposeScene = () => {};
    void Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
      import("@sparkjsdev/spark"),
    ])
      .then(async ([THREE, { OrbitControls }, { SparkRenderer, SplatMesh }]) => {
        if (disposed) return;
        const runtime = createSplatRuntime(
          { THREE, OrbitControls, SparkRenderer, SplatMesh },
          { assetUrl, lod, canvasHost },
        );
        disposeScene = runtime.dispose;
        await runtime.splats.initialized;
        if (disposed) return;
        runtime.splats.updateMatrixWorld(true);
        const framing = frameSplats(THREE, runtime, filterScaleOutliers, initialCamera);
        const crowd = createCrowdOverlay(THREE, runtime.splats.parent, framing);
        updateCrowdRef.current = (positions) => crowd.update(positions, viewer);
        updateCrowdRef.current(crowdPositionsRef.current);
        writeSplatDiagnostics(viewer, framing);
        setState("ready");
        disposeScene = () => {
          updateCrowdRef.current = null;
          crowd.dispose();
          runtime.dispose();
        };
      })
      .catch((error: unknown) => {
        if (!disposed) {
          viewer.dataset.splatError = error instanceof Error ? error.message : String(error);
          setState("error");
        }
      });
    return () => {
      disposed = true;
      disposeScene();
    };
  }, [assetUrl, filterScaleOutliers, initialCamera, lod]);

  return (
    <div className="splat-viewer" ref={viewerRef} aria-label="Gaussian Splat 3D 장면">
      <div className="splat-viewer-canvas" ref={canvasHostRef} />
      {state !== "ready" && (
        <div className={`splat-viewer-state ${state}`} aria-live="polite">
          {state === "loading" ? "3D 장면을 불러오는 중" : "3D asset을 열 수 없습니다."}
        </div>
      )}
    </div>
  );
}
