import { useEffect, useState } from "react";

import { loadSceneToolchain, type Toolchain } from "./sceneApi";

export function useSceneToolchain() {
  const [toolchain, setToolchain] = useState<Toolchain | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadSceneToolchain(controller.signal)
      .then(setToolchain)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "GPU worker API가 연결되지 않았습니다.");
        }
      });
    return () => controller.abort();
  }, []);

  return { toolchain, error };
}
