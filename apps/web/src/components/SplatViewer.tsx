import { useEffect, useRef, useState } from "react";

type SplatViewerProps = {
  assetUrl: string;
  filterScaleOutliers?: boolean;
  initialCamera?: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  } | null;
  lod?: boolean;
};

function quantile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

export function SplatViewer({
  assetUrl,
  filterScaleOutliers = false,
  initialCamera = null,
  lod = true,
}: SplatViewerProps) {
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
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: "high-performance",
        });
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
          splats.updateMatrixWorld(true);
          const bounds = splats.getBoundingBox(true).clone().applyMatrix4(splats.matrixWorld);
          const splatCount = splats.packedSplats?.numSplats ?? splats.extSplats?.numSplats ?? 0;
          const sampleStride = Math.max(1, Math.ceil(splatCount / 20_000));
          const sampled = {
            x: [] as number[],
            y: [] as number[],
            z: [] as number[],
            scale: [] as number[],
          };
          splats.forEachSplat((index, point, scales, _quaternion, opacity) => {
            if (index % sampleStride !== 0 || opacity < 0.02) return;
            const worldPoint = point.clone().applyMatrix4(splats.matrixWorld);
            sampled.x.push(worldPoint.x);
            sampled.y.push(worldPoint.y);
            sampled.z.push(worldPoint.z);
            sampled.scale.push(Math.max(scales.x, scales.y, scales.z));
          });
          sampled.x.sort((a, b) => a - b);
          sampled.y.sort((a, b) => a - b);
          sampled.z.sort((a, b) => a - b);
          sampled.scale.sort((a, b) => a - b);
          const framingBounds = new THREE.Box3(
            new THREE.Vector3(
              quantile(sampled.x, 0.02),
              quantile(sampled.y, 0.02),
              quantile(sampled.z, 0.02),
            ),
            new THREE.Vector3(
              quantile(sampled.x, 0.98),
              quantile(sampled.y, 0.98),
              quantile(sampled.z, 0.98),
            ),
          );
          const center = framingBounds.getCenter(new THREE.Vector3());
          const size = framingBounds.getSize(new THREE.Vector3());
          const largestAxis = Math.max(size.x, size.y, size.z, 0.1);
          const scaleThreshold = quantile(sampled.scale, 0.99) * 3;
          let hiddenOutliers = 0;
          const source = splats.packedSplats ?? splats.extSplats;
          if (filterScaleOutliers && source && scaleThreshold > 0) {
            splats.forEachSplat((index, point, scales, quaternion, _opacity, color) => {
              if (Math.max(scales.x, scales.y, scales.z) <= scaleThreshold) return;
              source.setSplat(index, point, scales, quaternion, 0, color);
              hiddenOutliers += 1;
            });
          }
          const framingDistance =
            (largestAxis / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.35;
          if (initialCamera) {
            const initialPosition = new THREE.Vector3(...initialCamera.position).applyMatrix4(
              splats.matrixWorld,
            );
            const initialTarget = new THREE.Vector3(...initialCamera.target).applyMatrix4(
              splats.matrixWorld,
            );
            const initialUp = new THREE.Vector3(...initialCamera.up)
              .transformDirection(splats.matrixWorld)
              .normalize();
            camera.position.copy(initialPosition);
            camera.up.copy(initialUp);
            controls.target.copy(initialTarget);
          } else {
            controls.target.copy(center);
            camera.position.set(
              center.x + framingDistance * 0.28,
              center.y + framingDistance * 0.18,
              center.z + framingDistance,
            );
          }
          camera.near = Math.max(framingDistance / 10_000, 0.001);
          camera.far = Math.max(framingDistance * 20, 100);
          camera.updateProjectionMatrix();
          controls.update();
          viewer.dataset.splatCount = String(splatCount);
          viewer.dataset.splatOutliersHidden = String(hiddenOutliers);
          viewer.dataset.splatScaleThreshold = scaleThreshold.toFixed(6);
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
          viewer.dataset.splatFramingBounds = [
            framingBounds.min.x,
            framingBounds.min.y,
            framingBounds.min.z,
            framingBounds.max.x,
            framingBounds.max.y,
            framingBounds.max.z,
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
