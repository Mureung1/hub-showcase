import { useEffect, useState } from "react";

export type PanelTextSize = "compact" | "default" | "large";

const STORAGE_KEY = "localtwin.panelTextSize";
const allowedSizes = new Set<PanelTextSize>(["compact", "default", "large"]);

function readStoredSize(): PanelTextSize {
  if (typeof window === "undefined") return "default";
  const stored = window.localStorage.getItem(STORAGE_KEY) as PanelTextSize | null;
  return stored && allowedSizes.has(stored) ? stored : "default";
}

export function usePanelTextSize() {
  const [size, setSize] = useState<PanelTextSize>(readStoredSize);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, size);
  }, [size]);

  return { size, setSize };
}
