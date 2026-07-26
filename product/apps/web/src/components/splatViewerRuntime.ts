import type { SceneCrowdPosition } from "../features/scene/sceneObservations";

type ThreeModule = typeof import("three");

type RuntimeDependencies = {
  THREE: ThreeModule;
  OrbitControls: new (...args: any[]) => any;
  SparkRenderer: new (...args: any[]) => any;
  SplatMesh: new (...args: any[]) => any;
};

type ViewerOptions = {
  assetUrl: string;
  lod: boolean;
  canvasHost: HTMLDivElement;
};

export type SplatRuntime = {
  viewer: HTMLDivElement;
  camera: any;
  controls: any;
  splats: any;
  dispose: () => void;
};

export type SplatFraming = {
  bounds: any;
  framingBounds: any;
  size: any;
  largestAxis: number;
  splatCount: number;
  hiddenOutliers: number;
  scaleThreshold: number;
};

export function createSplatRuntime(
  dependencies: RuntimeDependencies,
  { assetUrl, lod, canvasHost }: ViewerOptions,
): SplatRuntime {
  const { THREE, OrbitControls, SparkRenderer, SplatMesh } = dependencies;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9efeb);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x52695f, 2.2));
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
  return {
    viewer: canvasHost.closest<HTMLDivElement>(".splat-viewer")!,
    camera,
    controls,
    splats,
    dispose: () => {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      splats.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function quantile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

function sampleSplatBounds(THREE: ThreeModule, splats: any) {
  const splatCount = splats.packedSplats?.numSplats ?? splats.extSplats?.numSplats ?? 0;
  const sampleStride = Math.max(1, Math.ceil(splatCount / 20_000));
  const sampled = {
    x: [] as number[],
    y: [] as number[],
    z: [] as number[],
    scale: [] as number[],
  };
  splats.forEachSplat(
    (index: number, point: any, scales: any, _quaternion: any, opacity: number) => {
      if (index % sampleStride !== 0 || opacity < 0.02) return;
      const worldPoint = point.clone().applyMatrix4(splats.matrixWorld);
      sampled.x.push(worldPoint.x);
      sampled.y.push(worldPoint.y);
      sampled.z.push(worldPoint.z);
      sampled.scale.push(Math.max(scales.x, scales.y, scales.z));
    },
  );
  sampled.x.sort((a, b) => a - b);
  sampled.y.sort((a, b) => a - b);
  sampled.z.sort((a, b) => a - b);
  sampled.scale.sort((a, b) => a - b);
  return {
    bounds: splats.getBoundingBox(true).clone().applyMatrix4(splats.matrixWorld),
    framingBounds: new THREE.Box3(
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
    ),
    scaleThreshold: quantile(sampled.scale, 0.99) * 3,
    splatCount,
  };
}

export function frameSplats(
  THREE: ThreeModule,
  runtime: SplatRuntime,
  filterScaleOutliers: boolean,
  initialCamera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  } | null,
): SplatFraming {
  const { bounds, framingBounds, scaleThreshold, splatCount } = sampleSplatBounds(
    THREE,
    runtime.splats,
  );
  const center = framingBounds.getCenter(new THREE.Vector3());
  const size = framingBounds.getSize(new THREE.Vector3());
  const largestAxis = Math.max(size.x, size.y, size.z, 0.1);
  const source = runtime.splats.packedSplats ?? runtime.splats.extSplats;
  let hiddenOutliers = 0;
  if (filterScaleOutliers && source && scaleThreshold > 0) {
    runtime.splats.forEachSplat(
      (index: number, point: any, scales: any, quaternion: any, _opacity: number, color: any) => {
        if (Math.max(scales.x, scales.y, scales.z) <= scaleThreshold) return;
        source.setSplat(index, point, scales, quaternion, 0, color);
        hiddenOutliers += 1;
      },
    );
  }
  const framingDistance =
    (largestAxis / (2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)))) * 1.35;
  if (initialCamera) {
    runtime.camera.position.copy(
      new THREE.Vector3(...initialCamera.position).applyMatrix4(runtime.splats.matrixWorld),
    );
    runtime.controls.target.copy(
      new THREE.Vector3(...initialCamera.target).applyMatrix4(runtime.splats.matrixWorld),
    );
    runtime.camera.up.copy(
      new THREE.Vector3(...initialCamera.up)
        .transformDirection(runtime.splats.matrixWorld)
        .normalize(),
    );
  } else {
    runtime.controls.target.copy(center);
    runtime.camera.position.set(
      center.x + framingDistance * 0.28,
      center.y + framingDistance * 0.18,
      center.z + framingDistance,
    );
  }
  runtime.camera.near = Math.max(framingDistance / 10_000, 0.001);
  runtime.camera.far = Math.max(framingDistance * 20, 100);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.update();
  return { bounds, framingBounds, size, largestAxis, splatCount, hiddenOutliers, scaleThreshold };
}

export function createCrowdOverlay(THREE: ThreeModule, scene: any, framing: SplatFraming) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x2f8b61,
    roughness: 0.85,
    metalness: 0,
  });
  const bodyGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.7, 6);
  const headGeometry = new THREE.SphereGeometry(0.19, 8, 6);
  const maxCrowdSize = 32;
  const bodies = new THREE.InstancedMesh(bodyGeometry, material, maxCrowdSize);
  const heads = new THREE.InstancedMesh(headGeometry, material, maxCrowdSize);
  bodies.count = 0;
  heads.count = 0;
  bodies.frustumCulled = false;
  heads.frustumCulled = false;
  scene.add(bodies, heads);
  const personScale = framing.largestAxis * 0.055;
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3(personScale, personScale, personScale);
  const rotation = new THREE.Quaternion();
  return {
    update: (positions: readonly SceneCrowdPosition[], viewer: HTMLDivElement) => {
      const visible = positions.slice(0, maxCrowdSize);
      bodies.count = visible.length;
      heads.count = visible.length;
      visible.forEach((position, index) => {
        const x = framing.framingBounds.min.x + position.x * framing.size.x;
        const z = framing.framingBounds.min.z + position.z * framing.size.z;
        const floorY = framing.framingBounds.min.y + personScale * 0.36;
        matrix.compose(new THREE.Vector3(x, floorY, z), rotation, scale);
        bodies.setMatrixAt(index, matrix);
        matrix.compose(new THREE.Vector3(x, floorY + personScale * 0.54, z), rotation, scale);
        heads.setMatrixAt(index, matrix);
      });
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
      viewer.dataset.crowdCount = String(visible.length);
    },
    dispose: () => {
      bodyGeometry.dispose();
      headGeometry.dispose();
      material.dispose();
    },
  };
}

export function writeSplatDiagnostics(viewer: HTMLDivElement, framing: SplatFraming) {
  viewer.dataset.splatCount = String(framing.splatCount);
  viewer.dataset.splatOutliersHidden = String(framing.hiddenOutliers);
  viewer.dataset.splatScaleThreshold = framing.scaleThreshold.toFixed(6);
  viewer.dataset.splatBounds = [
    framing.bounds.min.x,
    framing.bounds.min.y,
    framing.bounds.min.z,
    framing.bounds.max.x,
    framing.bounds.max.y,
    framing.bounds.max.z,
  ]
    .map((value: number) => value.toFixed(3))
    .join(",");
  viewer.dataset.splatFramingBounds = [
    framing.framingBounds.min.x,
    framing.framingBounds.min.y,
    framing.framingBounds.min.z,
    framing.framingBounds.max.x,
    framing.framingBounds.max.y,
    framing.framingBounds.max.z,
  ]
    .map((value: number) => value.toFixed(3))
    .join(",");
}
