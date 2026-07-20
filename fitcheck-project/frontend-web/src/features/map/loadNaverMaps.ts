const SCRIPT_ID = 'naver-maps-sdk';

let loadPromise: Promise<typeof naver.maps> | null = null;

export function getNaverMapClientId(): string {
  return (import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined)?.trim() ?? '';
}

export function loadNaverMaps(clientId: string): Promise<typeof naver.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 지도를 로드할 수 있습니다.'));
  }

  if (window.naver?.maps) {
    return Promise.resolve(window.naver.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => {
        if (window.naver?.maps) resolve(window.naver.maps);
        else reject(new Error('네이버 지도 SDK 로드에 실패했습니다.'));
      });
      existing.addEventListener('error', () => {
        loadPromise = null;
        reject(new Error('네이버 지도 SDK 스크립트를 불러오지 못했습니다.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`;
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else {
        loadPromise = null;
        reject(new Error('네이버 지도 SDK가 초기화되지 않았습니다.'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('네이버 지도 SDK 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
