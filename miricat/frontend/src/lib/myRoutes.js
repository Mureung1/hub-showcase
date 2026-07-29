// "내 경로" = 이 브라우저에서 등록한 경로 id 목록 (localStorage).
// 계정 없이 개인화하는 경량 방식 — 서버(보초)는 전체 경로를 계속 감시하고, 화면만 내 것을 보여준다.
const KEY = "miricat_my_routes";

export function myRouteIds() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addMyRoute(id) {
  const ids = myRouteIds();
  if (!ids.includes(id)) localStorage.setItem(KEY, JSON.stringify([...ids, id]));
}

export function removeMyRoute(id) {
  localStorage.setItem(KEY, JSON.stringify(myRouteIds().filter((x) => x !== id)));
}
