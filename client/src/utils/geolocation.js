// 브라우저 Geolocation API를 Promise로 감싼 헬퍼. 실패(권한 거부/미지원/타임아웃)는 reject로 전달하고,
// 호출하는 쪽(MapScreen)에서 토스트로 안내 + 기본값 유지를 책임진다.
export function requestCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않아요.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
