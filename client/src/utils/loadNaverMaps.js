// 네이버지도(NAVER Cloud Platform Maps JS API v3) 스크립트를 동적으로 주입해서 로드한다.
// index.html에 정적 <script> 태그를 두는 대신 이렇게 하면 키 미설정/로드 실패를 화면에서 부드럽게 처리할 수 있다.
// CLAUDE.md 결정사항: npm 래퍼 패키지 대신 공식 스크립트 방식 사용(버전 관리 이슈 회피).
let loadPromise = null;

export function loadNaverMaps(clientId) {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // NCP 콘솔 "예제 코드" 기준 파라미터명. 예전 문서엔 ncpClientId로 안내된 적도 있으니
    // 콘솔에서 다르게 안내되면 여기만 바꾸면 된다.
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else reject(new Error('네이버 지도 스크립트가 로드됐지만 maps 객체를 찾을 수 없습니다.'));
    };
    script.onerror = () => reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  }).catch((err) => {
    loadPromise = null; // 실패 시 다음 시도에서 다시 로드할 수 있게 초기화
    throw err;
  });

  return loadPromise;
}
