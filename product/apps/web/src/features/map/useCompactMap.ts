import { useEffect, useState } from "react";

const COMPACT_MAP_QUERY = "(max-width: 760px)";

function compactMapMatches() {
  return typeof window !== "undefined" && window.matchMedia?.(COMPACT_MAP_QUERY).matches === true;
}

export function useCompactMap() {
  const [compact, setCompact] = useState(compactMapMatches);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(COMPACT_MAP_QUERY);
    const update = () => setCompact(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return compact;
}
