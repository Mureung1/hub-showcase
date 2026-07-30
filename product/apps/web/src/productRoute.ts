const PRODUCT_HOME_PATH = "/home";

export function normalizeProductRoute(location: Location, history: History) {
  if (location.pathname === "/en" || new URLSearchParams(location.search).has("demo")) return;
  if (location.pathname === PRODUCT_HOME_PATH && !location.search && !location.hash) return;

  history.replaceState(history.state, "", PRODUCT_HOME_PATH);
}
