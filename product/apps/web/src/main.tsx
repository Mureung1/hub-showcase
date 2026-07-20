import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const showStorefrontPrototype =
  new URLSearchParams(window.location.search).get("demo") === "storefront";
const showFlowerMapPrototype =
  new URLSearchParams(window.location.search).get("demo") === "flower-map";
const reactRoot = createRoot(root);

function renderApplication(application: ReactNode) {
  reactRoot.render(<StrictMode>{application}</StrictMode>);
}

if (showFlowerMapPrototype) {
  renderApplication(<main aria-busy="true">꽃 테마 점포 지도를 준비하는 중입니다.</main>);
  void import("./features/map/storefronts/FlowerStorefrontMapPrototype.tsx")
    .then(({ FlowerStorefrontMapPrototype }) => renderApplication(<FlowerStorefrontMapPrototype />))
    .catch(() =>
      renderApplication(<main role="alert">꽃 테마 점포 지도를 불러오지 못했습니다.</main>),
    );
} else if (showStorefrontPrototype) {
  renderApplication(<main aria-busy="true">3D storefront를 준비하는 중입니다.</main>);
  void import("./features/map/storefronts/StorefrontPrototype.tsx")
    .then(({ StorefrontPrototype }) => renderApplication(<StorefrontPrototype />))
    .catch(() => renderApplication(<main role="alert">3D storefront를 불러오지 못했습니다.</main>));
} else {
  renderApplication(<App />);
}
