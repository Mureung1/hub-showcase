import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createStorefront, disposeStorefront } from "./createStorefront";
import { getStorefrontVariant } from "./storefrontRegistry";
import "./storefrontPrototype.css";

export function StorefrontPrototype() {
  const canvasHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvasHost = canvasHostRef.current;
    if (!canvasHost) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0e6);
    scene.fog = new THREE.Fog(0xf5f0e6, 11, 19);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(6.6, 4.8, 8.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvasHost.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff8e8, 0x61766a, 2.2));
    const sun = new THREE.DirectionalLight(0xfff1d4, 3.6);
    sun.position.set(5, 8, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const storefront = createStorefront(getStorefrontVariant("CS300028"));
    storefront.rotation.y = -0.18;
    scene.add(storefront);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0xe8e1d3, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.28;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 1.4, 0);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.55;

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

    canvasHost.dataset.storefrontState = "ready";
    canvasHost.dataset.storefrontCategory = storefront.userData.categoryCode;

    return () => {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposeStorefront(storefront);
      floor.geometry.dispose();
      if (Array.isArray(floor.material)) {
        floor.material.forEach((material) => material.dispose());
      } else {
        floor.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <main className="storefront-prototype-shell">
      <section className="storefront-prototype-copy" aria-labelledby="storefront-title">
        <p className="storefront-prototype-eyebrow">MAP-004 · FIRST SLICE</p>
        <h1 id="storefront-title">연남꽃집 3D Storefront</h1>
        <p>
          기본 점포 geometry에 파스텔 material, 꽃 간판과 화분 attachment를 조합한 첫 번째
          procedural prototype입니다.
        </p>
        <dl>
          <div>
            <dt>Prefab</dt>
            <dd>small-shop</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>CS300028 · 꽃집</dd>
          </div>
          <div>
            <dt>Renderer</dt>
            <dd>Three.js WebGL</dd>
          </div>
        </dl>
        <p className="storefront-prototype-help">마우스로 회전하고 휠로 확대해 보세요.</p>
      </section>
      <section className="storefront-prototype-stage" aria-label="꽃집 3D storefront 미리보기">
        <div ref={canvasHostRef} className="storefront-prototype-canvas" />
        <span className="storefront-prototype-badge">PROCEDURAL 3D</span>
      </section>
    </main>
  );
}
