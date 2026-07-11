import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SplatViewer } from "./components/SplatViewer";
import "./styles/global.css";

export function SplatSmokePage() {
  return (
    <main style={{ width: "100vw", height: "100vh", padding: 24, background: "#dce5df" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>Synthetic Gaussian renderer QA</h1>
      <div style={{ width: "min(920px, 100%)", height: "min(70vh, 620px)" }}>
        <SplatViewer assetUrl="/smoke/scene.ply" lod={false} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SplatSmokePage />
  </StrictMode>,
);
