type NaverMaps = {
  Map: new (element: HTMLElement, options: unknown) => unknown;
  LatLng: new (latitude: number, longitude: number) => unknown;
  Marker: new (options: unknown) => { setMap: (map: unknown | null) => void };
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  Event: { addListener: (target: unknown, event: string, handler: (event: { coord: { lat: () => number; lng: () => number } }) => void) => unknown };
};

declare global {
  interface Window {
    naver?: { maps: NaverMaps };
  }
}

let loadPromise: Promise<NaverMaps> | undefined;

export function loadNaverMaps(): Promise<NaverMaps> {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  if (loadPromise) return loadPromise;

  const clientId = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;
  if (!clientId) return Promise.reject(new Error("지도 Client ID가 설정되지 않았습니다."));

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`;
    script.async = true;
    script.onload = () => window.naver?.maps ? resolve(window.naver.maps) : reject(new Error("지도 SDK를 불러오지 못했습니다."));
    script.onerror = () => reject(new Error("네이버 지도 SDK 요청이 실패했습니다."));
    document.head.appendChild(script);
  });

  return loadPromise;
}
