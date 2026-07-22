# 3주차 배포 전 점검 리포트 (week3-features)

PRD: [docs/PRD_v2.md](PRD_v2.md) · 브랜치: `week3-features` (main 기준 4커밋, 58파일 +3799/-718)

| 커밋 | 내용 |
|---|---|
| `487644d` | feat: ID/PW auth, remove Google OAuth |
| `1a9d9bd` | feat: cross-platform CSV import/export |
| `3503aa0` | feat: Coupang Partners supplement ads |
| `cac8827` | feat: Toss-style interactions |

---

## A. 자동 점검 결과 (코드로 확인한 것)

| 항목 | 결과 |
|---|---|
| `npm run build` | ✅ 에러 0 · 581.82 kB (gzip 170.93 kB) |
| `npm run lint` (oxlint) | ✅ 에러 0 · 경고 4건(전부 3주차 이전부터 있던 `only-export-components`/`exhaustive-deps`) |
| `npm run check:ads` | ✅ 24개 단언 전부 통과 |
| 헤드리스 크롬 렌더 (9개 라우트) | ✅ 전부 렌더 · **콘솔 에러 0건** |
| 구글 OAuth 실행 코드 | ✅ **0건** (`signInWithOAuth`/`provider:'google'`/`gapi`/`googleapis`/`loginWithGoogle`) |
| 구글 관련 패키지/환경변수 | ✅ 0건 |
| 애니메이션이 건드리는 CSS 속성 | ✅ `transform`/`opacity`만 (예외 2건은 아래 참고) |
| 비밀번호 클라이언트 저장/로그 | ✅ 0건 |
| 무조건 실행되는 `console.log` | ✅ 0건 (1건은 `import.meta.env.DEV` 가드, 기존 진단 로그) |
| `debugger`/`TODO`/`FIXME` | ✅ 0건 |

### grep 잔여물 해명 (0건이 아닌 것들)

`grep -rniE "google|oauth|gapi"`에 걸리지만 **전부 남아 있어야 하는 것들**이다:

| 위치 | 내용 | 왜 남기나 |
|---|---|---|
| `server/proxy.js:12` | `const MODEL = 'google/gemini-3-flash-preview'` | OpenRouter의 **모델 식별자**. 음식 인식 AI. 인증과 무관 |
| `supabase/migrations/2026-07-22_id-password-auth.sql` | `provider = 'google'` 등 | **구글 계정을 지우는 스크립트 본문**. 이게 없으면 삭제가 안 됨 |
| `src/pages/Login.jsx:12` | 주석 | 왜 소셜 로그인을 없앴는지 설명 |
| `README.md` | 문서 | Supabase 대시보드에서 Google provider를 끄라는 안내 |
| `dist/assets/index-*.js` | `signInWithOAuth` 1건 | **`@supabase/supabase-js` 라이브러리 자체의 메서드 정의**. 앱 코드에서 호출하지 않아 도달 불가. 제거하려면 라이브러리를 포크해야 하므로 그대로 둠 |
| `android/*/build.gradle` | `google()`, `com.google.gms` | **Maven 저장소 주소**와 Capacitor 기본 템플릿. 지우면 빌드 실패 |

### 애니메이션 속성 예외 2건 (의도)

`Result.jsx:81`, `NutritionStatusPanel.jsx:103`의 `transition: stroke-dashoffset`.
SVG 원형 진행 표시(달성률 링)의 표준 기법이고, **레이아웃을 유발하지 않는 페인트 전용 속성**이라
FR-4.3이 금지하는 `width`/`height`/`top`/`left`와 성격이 다르다.

### 새로 추가된 의존성 (2개)

| 패키지 | 용도 |
|---|---|
| `@capacitor/filesystem@^6.0.4` | APK에서 CSV를 공용 `Documents` 폴더에 저장 (웹뷰가 `<a download>` blob을 처리 못 하는 제약 우회) |
| `@capacitor/share@^6.0.4` | 저장 후 공유 시트 열기 |

둘 다 기존 `@capacitor/core@^6.2.1`과 같은 v6 라인. **웹 번들에는 들어가지 않는다** — 네이티브에서만
동적 import되어 별도 청크(8.38 kB)로 분리된다.

> `framer-motion`은 실측 후 **채택하지 않았다** — 상세는 [interaction-guide.md](interaction-guide.md#1-framer-motion을-쓰지-않은-이유-번들-실측).

---

## B. PRD 수용 기준 대조표

### §1 인증 전환

| 수용 기준 | 상태 | 근거 / 확인 방법 |
|---|---|---|
| 구글 OAuth 코드·패키지·환경변수 0건 | ✅ | 위 grep 결과 |
| 아이디/비번/비번확인/닉네임만으로 가입 → 즉시 홈 | ✅ 코드 완료 | `/signup` 렌더 확인(4개 필드 + 고지 문구). **실제 가입은 아래 C-1 선행 필요** |
| 새로고침·앱 재시작 후 로그인 유지 | ✅ | supabase-js가 세션을 localStorage에 보관(기존 동작 그대로) |
| APK에서 가입·로그인 정상 | ⏳ 실기기 | 서버 API 호출뿐이라 웹뷰 제약 없음. 실기기 확인 필요 |
| 저장소에서 비밀번호가 해시 | ⏳ 대시보드 | GoTrue가 bcrypt로 해싱. 마이그레이션 SQL **5-3번** 쿼리로 눈 확인 |
| 기존 구글 연동 데이터 없음 | ⏳ **사용자 작업** | 마이그레이션 SQL 2번(백업) → 3번(삭제) 실행 필요 |

### §2 CSV 크로스플랫폼

| 수용 기준 | 상태 | 근거 |
|---|---|---|
| PC 크롬: 내보내기 → 엑셀 한글 정상 → 재가져오기 | ⏳ 수동 | BOM 부착은 코드로 확인(`scripts/sample-1000.csv` 첫 3바이트 `EF BB BF`) |
| 모바일 크롬: "내 파일 > 다운로드" 확인 | ⏳ 실기기 | |
| APK: 내보내기 → 저장 → 재가져오기 | ⏳ 실기기 | |
| 1,000행 3초 이내 | ✅ | `parseCsv` 실측 **3.0ms**/1,000행. 쓰기는 왕복 2회(날짜 수 무관)로 최적화 |
| 헤더 불일치 시 안내 + 형식 예시 | ✅ | `dataBackup.js`의 `EXPECTED_FORMAT_EXAMPLE` → 패널에 표시 |
| 중복 날짜 덮어쓰기/건너뛰기 | ✅ | `ImportConflictDialog` |
| 행 단위 실패 요약 | ✅ | "N건 가져옴, M건 실패". 검증용: `node scripts/generate-sample-csv.mjs 1000 out.csv --broken` (50행 고의 손상) |

절차서: [csv-crossplatform-test.md](csv-crossplatform-test.md)

### §3 쿠팡 파트너스 광고

| 수용 기준 | 상태 | 근거 |
|---|---|---|
| 부족 영양소 매칭 상품 노출 | ✅ **렌더 확인** | 비빔밥 1끼 기록 상태로 렌더 → 단백질 12%·지방 14%·식이섬유 20%가 잡혀 프로틴/아몬드/차전자피 노출 |
| 기록 없을 때 폴백 노출(배너 안 비어짐) | ✅ **렌더 확인** | 기록 0인 상태 → 마그네슘/오메가-3/비타민C 노출 |
| 카드 탭 → 실제 쿠팡 페이지 (APK는 외부 브라우저) | ⚠️ **자리표시자** | 링크는 진짜 쿠팡 검색 URL이라 이동은 동작. **파트너스 링크로 교체 필요**(C-2) |
| AD 배지 + 고지 문구 상시 | ✅ **렌더 확인** | DOM에서 `>AD<` + 고지 문구 원문 확인 |
| 상품 추가가 데이터 파일 수정만으로 | ✅ | `src/data/coupangProducts.js` 배열에 객체 추가만 |

### §4 인터랙션

| 수용 기준 | 상태 | 근거 |
|---|---|---|
| 방향성 슬라이드, 끊김 0건 | ✅ 코드 완료 | View Transitions + CSS 폴백. **체감은 실기기 확인**(C-3) |
| 터치 후 100ms 이내 피드백 | ✅ | 프레스-인 트랜지션 90ms |
| CPU 4x에서 프레임 드랍 없음 | ⏳ 수동 | 절차: [interaction-guide.md §4](interaction-guide.md) |
| 동작 줄이기 시 페이드 대체 | ✅ 코드 완료 | `@media (prefers-reduced-motion: reduce)`로 슬라이드/바운스/스케일 전부 대체 |

---

## C. 배포 전 **반드시** 해야 하는 사용자 작업

### C-1. Supabase 대시보드 설정 (안 하면 가입이 안 됨)

[`supabase/migrations/2026-07-22_id-password-auth.sql`](../supabase/migrations/2026-07-22_id-password-auth.sql) **1번 블록**:

- [ ] **Authentication → Sign In / Providers → Email → Confirm email: OFF** ← **필수**
      (앱은 아이디를 `<아이디>@mealyze.app` 합성 이메일로 바꿔 넘긴다. 수신 불가 주소라 확인 메일을
      켜두면 가입이 "메일 확인 대기"에서 멈춘다)
- [ ] **Authentication → Sign In / Providers → Google: Disable**
- [ ] (권장) Minimum password length → 8

### C-2. 기존 구글 계정 데이터 백업 → 삭제 (되돌릴 수 없음)

같은 SQL 파일을 **한 블록씩** 실행:

- [ ] **2번 백업** — 4개 쿼리 실행 후 각각 **Download CSV**로 로컬 보관 (PRD FR-1.3)
- [ ] **3번 삭제** — 백업 CSV를 손에 쥔 뒤에만
- [ ] **5번 검증** — 구글 identity 0건 / 고아 데이터 0건 / `encrypted_password`가 `$2a$...` bcrypt 형태

> 4번 블록(마이그레이션 이전 이메일 계정 정리)은 PRD 범위 밖이라 **주석 처리해 두었다**. 그 계정들은
> 새 로그인 화면으로 접근할 방법이 없어 사실상 방치 상태가 되므로, 정리하려면 백업 후 주석을 풀 것.

### C-3. 쿠팡 파트너스 링크 교체

- [ ] partners.coupang.com 승인 후, 영양소별 상품의 **파트너스 링크 + 이미지 URL** 확보
- [ ] [`src/data/coupangProducts.js`](../src/data/coupangProducts.js)의 `productName`/`price`/
      `imageUrl`/`partnersUrl` 4개 값만 교체 (`id`/`nutrient`는 건드리지 말 것 — 추천 로직의 키)
- [ ] `npm run check:ads`로 데이터 무결성 재확인

현재 `partnersUrl`은 **실제 쿠팡 검색 URL**이라 "카드 탭 → 쿠팡 페이지 이동" 동작 자체는 지금도 검증
가능하다(제휴 수수료만 발생하지 않음). `imageUrl`이 비어 있으면 영양소 이니셜 배지로 자동 대체된다.

### C-4. APK 재빌드

- [ ] `npm run app:sync` — **필수**. `@capacitor/filesystem`/`@capacitor/share` 두 플러그인이 새로
      추가돼 네이티브 프로젝트 동기화가 필요하다(안 하면 CSV 내보내기가 앱에서 실패)
- [ ] `AndroidManifest.xml`에 `WRITE_EXTERNAL_STORAGE`(maxSdkVersion 29)가 들어갔는지 확인
- [ ] 이 앱은 **원격 URL 방식**이라, 웹 변경분이 배포되어야 앱에도 반영된다 — 배포 먼저, APK 설치 나중

---

## D. 실기기 통합 시나리오 (사람이 직접)

- [ ] 신규 가입(아이디/비번/비번확인/닉네임) → 즉시 홈 진입
- [ ] 아이디 4자 미만 / 비번 8자 미만 / 비번 불일치 → 각 필드 아래 인라인 에러
- [ ] 같은 아이디로 재가입 시도 → 아이디 필드 아래 "이미 사용 중인 아이디예요."
- [ ] 로그인 5회 연속 실패 → "로그인 시도가 너무 많아요. N초 후에…" · 1분 뒤 해제
- [ ] 로그인 → 새로고침 → 세션 유지 / 앱 종료 → 재실행 → 세션 유지
- [ ] 게스트로 기록 남긴 뒤 가입 → **게스트 데이터 승계 프롬프트**가 뜨고 동의 시 이관 (FR-1.3 유지 요건)
- [ ] 사진 분석 1회 → 식단 탭에서 부족 영양소 광고 배너 확인 → 카드 탭 → 쿠팡 페이지 열림
- [ ] CSV 내보내기 → 다운로드 폴더/Documents 확인 → 앱에서 재가져오기
- [ ] 탭 4~5개 왕복하며 슬라이드 방향·터치 피드백 체감 (과하면 조정 위치는 interaction-guide §5)
- [ ] OS "동작 줄이기" 켠 상태 → 페이드로 대체되는지

전부 통과하면 `main` 머지 & Production 배포.
