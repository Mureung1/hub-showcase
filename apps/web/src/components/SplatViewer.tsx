import { useEffect, useRef, useState } from "react";

type SplatViewerProps = {
  assetUrl: string;
};

export function SplatViewer({ assetUrl }: SplatViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
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
        host.replaceChildren(renderer.domElement);

        const spark = new SparkRenderer({ renderer });
        scene.add(spark);
        const splats = new SplatMesh({ url: assetUrl, lod: true });
        splats.quaternion.set(1, 0, 0, 0);
        scene.add(splats);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.7, 0);
        controls.update();

        const resize = () => {
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
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
        if (!disposed) setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("error");
      });

    return () => {
      disposed = true;
      disposeScene();
    };
  }, [assetUrl]);

  return (
    <div className="splat-viewer" ref={hostRef} aria-label="Gaussian Splat 3D 장면">
      {state !== "ready" && (
        <div className={`splat-viewer-state ${state}`} aria-live="polite">
          {state === "loading" ? "3D 장면을 불러오는 중" : "3D asset을 열 수 없습니다."}
        </div>
      )}
    </div>
  );
}
