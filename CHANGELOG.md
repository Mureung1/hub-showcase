# 변경 이력

## 2026-07-21

- 안드로이드 앱(Capacitor)을 **원격 URL 방식**으로 구성. `capacitor.config.json`에 `server.url`(배포 사이트)·
  `cleartext:false`·`androidScheme:"https"`·`allowNavigation`(배포 도메인+`*.supabase.co`) 추가 — 앱이 배포된
  웹사이트를 통째로 로드하므로 웹만 배포하면 앱도 자동 갱신(APK 재빌드 불필요).
- 하드웨어 뒤로가기 처리 추가(`src/lib/useAndroidBackButton.js`, App.jsx에서 호출): 하위 화면→이전 화면,
  홈(`/analyze`)→앱 종료. 웹에선 no-op.
- 보안 강화: `AndroidManifest.xml`에 `android:usesCleartextTraffic="false"`(HTTP 평문 차단), `allowNavigation`
  화이트리스트로 낯선 사이트 인앱 이동 차단. 네트워크 상태 확인용 `ACCESS_NETWORK_STATE` 권한 추가.
- 카메라·위치·파일 선택은 Capacitor 기본 브릿지가 처리(네이티브 코드 없이 순정 `BridgeActivity` 유지).
- 설정만 반영하는 `npm run app:sync:config` 스크립트 추가(웹 빌드 생략). 가이드(`docs/apk-build-guide.md`)를
  원격 URL 방식 기준으로 갱신.

## 2026-07-16

- 앱 시작 시 신체정보 유무와 무관하게 항상 홈(`/analyze`)으로 진입하도록 변경(기존: 신체정보 없으면
  MY 탭으로 강제 이동).
- 지도 표시를 카카오맵에서 네이버 지도(Web Dynamic Map)로 전환(`useNaverMapLoader.js`,
  `NaverPlaceMap.jsx`). 카카오 관련 코드는 롤백용으로 유지.
- 주변 식당 검색을 카카오 로컬 검색에서 네이버 API Hub 지역 검색으로 전환(`/api/naver-places`).
  좌표 기준 대략적 지역명을 검색어에 섞기 위한 `/api/reverse-geocode` 추가.
- 추천 식당 결과를 반경 3km 이내로 제한하고, 각 카드에 "네이버 지도에서 보기" 링크(가게명+주소
  기반 네이버 지도 검색 URL) 추가.
- MY 탭 최초 온보딩 화면의 개인정보 입력 폼을 접었다 펼 수 있게 변경(기존 "건강 정보" 아코디언과
  동일한 방식).
