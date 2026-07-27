# 변경 이력

## 2026-07-27

- **학교 급식·대학 학식 조회** 추가(PRD 4주차 1절). `src/lib/allergyRules.js`가 법정 표시 대상 19종을
  밀라이즈 코드(M1~M19)로 통일 — NEIS 알레르기 번호는 그대로 매핑(공식), 학식·일반 메뉴는 키워드로
  추정 태깅(`추정` 배지 필수). 초중고는 NEIS 오픈API(`/api/school-search`, `/api/school-meal`)로
  실시간 조회. 대학(충남대)은 크롤링(`server/univMealAdapters/cnu.js`) 우선 + 실패 시 수동 폴백
  JSON(`server/data/univ-meals.json`) 하이브리드 — 판정 로직은 `src/lib/cnuWeekFallback.js`.
  지도 탭에 "주변 식당 | 학식·급식" 토글과 `CafeteriaPanel` 서브 화면 추가.
- **급식·학식 카드 간소화** (보강 Step 6). 메뉴마다 알레르기 칩을 반복하던 표시를 `MealCard.jsx`
  하나로 통일 — 메뉴명 옆 번호 위첨자(`src/lib/allergyDisplay.js`) + 카드 하단 범례 1줄(중복 제거·
  오름차순)로 바꿔 카드 높이를 절반 이하로 줄였다. "오늘 먹은 음식"(MealsPage.jsx)과 같은 디자인
  언어(Card·타이포·접기/펼치기)를 따른다.
- **대학 학식 5개 식당 × 주간 크롤러 재작성** (보강 Step 7). `server/univMealAdapters/cnu.js`가
  제2~4학생회관·생활과학대학 4곳을 병렬로 크롤링해 이번 주 전체(6일)를 한 번에 받아온다(요일 탭
  클릭마다 다시 부르던 이전보다 훨씬 빠름, 24시간 캐시). 제1학생회관은 이 시스템에 실제 데이터가
  없어(실측) 외부 안내 페이지 링크로 대체. 순수 파서(`src/lib/cnuWeeklyParser.js`)가 학생/직원
  트랙을 각각 파싱하고 `(pork/beef/chicken included)` 주석을 알레르기 코드로 태깅한다. 지도 탭에
  식당 선택 세그먼트(`src/lib/cnuBuildings.js`, 기기별 저장) + 학생/직원 토글 추가.
- **직업 기반 식당 추천 + 지도 핀 구분** 추가(PRD 4주차 2절). 프로필에 직업(초등학생/중·고등학생/
  대학생/직장인/기타) 필드 추가, `src/lib/occupationKeywords.js`가 직업→검색 키워드·지도 탭 기본
  서브뷰를 매핑. 부족 영양소 추천(빨간 핀)과 별개로 직업 맞춤 추천(파란 핀, `NaverPlaceMap.jsx`)을
  지도에 함께 표시하고 범례로 구분. 직업 미설정 시 기존 지도 동작과 완전히 동일.
- **AI 식습관 분석 비서** 추가(PRD 4주차 3절). 달력 탭 상단 카드(`DietAnalysisCard.jsx`) — 버튼을
  눌러야만 실행되고, 같은 기간(7일/30일) 분석은 하루 1회만 호출(`dietAnalysisCache.js`). 원본 기록
  대신 집계 요약(`dietSummary.js`)만 Gemini에 전달, 4문장 이상·잘한 점→주의 패턴→실천 제안→격려
  구조를 프롬프트(`prompts/dietAnalysis.js`)로 강제.
- `profiles` 테이블에 `school_type`/`school_office_code`/`school_code`/`school_name`/`occupation`
  컬럼 추가(`supabase/migrations/2026-07-27_school-and-occupation-fields.sql`).

## 2026-07-21

- 안드로이드 앱(Capacitor)을 **원격 URL 방식**으로 구성. `capacitor.config.json`에 `server.url`(배포 사이트)·
  `cleartext:false`·`androidScheme:"https"`·`allowNavigation`(배포 도메인+`*.supabase.co`) 추가 — 앱이 배포된
  웹사이트를 통째로 로드하므로 웹만 배포하면 앱도 자동 갱신(APK 재빌드 불필요).
- 하드웨어 뒤로가기 처리 추가(`src/lib/useAndroidBackButton.js`, App.jsx에서 호출): 하위 화면→이전 화면,
  홈(`/analyze`)→앱 종료. 웹에선 no-op.
- 보안 강화: `AndroidManifest.xml`에 `android:usesCleartextTraffic="false"`(HTTP 평문 차단), `allowNavigation`
  화이트리스트로 낯선 사이트 인앱 이동 차단. 네트워크 상태 확인용 `ACCESS_NETWORK_STATE` 권한 추가.
- 카메라·위치·파일 선택은 Capacitor 기본 브릿지가 처리(네이티브 코드 없이 순정 `BridgeActivity` 유지).
- 설정만 반영하는 `npm run app:sync:config` 스크립트 추가(웹 빌드 생략). 가이드(`docs/03-개발스펙/apk-build-guide.md`)를
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
