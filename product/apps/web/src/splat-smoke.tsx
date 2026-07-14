import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { SplatViewer } from "./components/SplatViewer";
import "./styles/global.css";

export function SplatSmokePage() {
  const query = new URLSearchParams(window.location.search);
  const assetUrl = query.get("asset") || "/smoke/scene.ply";
  const isExternalJob = assetUrl.startsWith("/api/v1/scenes/jobs/");
  const jobId = assetUrl.match(/^\/api\/v1\/scenes\/jobs\/([^/]+)\/asset$/)?.[1] ?? null;
  const [initialCamera, setInitialCamera] = useState<{
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  } | null>(null);

  useEffect(() => {
    if (!jobId) return;
    void fetch(`/api/v1/scenes/jobs/${jobId}`)
      .then((response) => response.json())
      .then((job: { camera_pose?: typeof initialCamera }) =>
        setInitialCamera(job.camera_pose ?? null),
      );
  }, [jobId]);

  return (
    <main style={{ width: "100vw", height: "100vh", padding: 24, background: "#dce5df" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>
        {isExternalJob ? "GPU server Gaussian renderer QA" : "Synthetic Gaussian renderer QA"}
      </h1>
      <div style={{ width: "min(920px, 100%)", height: "min(70vh, 620px)" }}>
        <SplatViewer
          assetUrl={assetUrl}
          filterScaleOutliers={isExternalJob}
          initialCamera={initialCamera}
          lod={false}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SplatSmokePage />
  </StrictMode>,
);
