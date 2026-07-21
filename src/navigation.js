import { useEffect, useState } from "react";

const supportedPaths = new Set(["/", "/group-buys", "/activity", "/pickup", "/login"]);

export function useNavigation() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(path) {
    const nextPath = normalizePath(path);
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { pathname, navigate };
}

function normalizePath(path) {
  return supportedPaths.has(path) || path.startsWith("/group-buys/") ? path : "/";
}
