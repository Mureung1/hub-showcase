import { useEffect, useRef, useState } from "react";

type SplatViewerProps = {
  assetUrl: string;
  lod?: boolean;
};

export function SplatViewer({ assetUrl, lod = true }: SplatViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

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
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe9efeb);
        const camera = new THREE.PerspectiveCamera(58, 1, 0.01, 2_000);
        camera.position.set(0, 1.4, 4.5);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        canvasHost.replaceChildren(renderer.domElement);

        const spark = new SparkRenderer({ renderer });
        scene.add(spark);
        const splats = new SplatMesh({ url: assetUrl, lod });
        splats.quaternion.set(1, 0, 0, 0);
        scene.add(splats);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.7, 0);
        controls.update();

        const resize = () => {
          const width = Math.max(1, canvasHost.clientWidth);
          const height = Math.max(1, canvasHost.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvasHost);
        resize();
        renderer.setAnimationLoop(() => {
          controls.update();
          renderer.render(scene, camera);
        });

        disposeScene = () => {
          resizeObserver.disconnect();
          renderer.setAnimationLoop(null);
          controls.dispose();
          splats.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
        await splats.initialized;
        if (!disposed) {
          const bounds = splats.getBoundingBox();
          const splatCount = splats.packedSplats?.numSplats ?? splats.extSplats?.numSplats ?? 0;
          viewer.dataset.splatCount = String(splatCount);
          viewer.dataset.splatBounds = [
            bounds.min.x,
            bounds.min.y,
            bounds.min.z,
            bounds.max.x,
            bounds.max.y,
            bounds.max.z,
          ]
            .map((value) => value.toFixed(3))
            .join(",");
          setState("ready");
        }
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
  }, [assetUrl, lod]);

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
