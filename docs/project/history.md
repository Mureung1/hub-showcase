# 프로젝트 작업 이력

구현 티켓을 종료할 때 다음 작업의 판단에 필요한 결과만 최신 항목이 위로 오도록 기록한다.

## 기록 형식

```markdown
## YYYY-MM-DD · TICKET-ID · 완료|부분 완료|차단

- 결과: 사용자가 확인할 수 있는 동작 변화
- 결정: 이후에도 유지할 구현 또는 정책 결정, 없으면 `없음`
- 시행착오: 실패한 접근과 선택한 대안, 없으면 `없음`
- 검증: 실제 실행한 명령과 결과
- 후속: 연결된 티켓 ID, 없으면 `없음`
- 반복 패턴: `pattern-key`, 없으면 `없음`
```

## 이력

## 2026-07-23 · FE-AI-002 · 완료

- 결과: AI 초안의 제목, 설명, 인원, 조리 시간, 재료와 조리 단계를 편집하고 배열 항목을 추가·삭제·재정렬할 수 있다. 필수값과 숫자 범위 오류는 관련 입력에 표시되고 초점이 이동하며, AI 경고와 읽기 전용 출처를 연결해 표시한다. 취소 시 레시피 입력 화면으로 돌아가고 모바일에서는 단일 종이 폼으로 사용할 수 있다.
- 결정: 초안 편집 폼은 정규화한 초안을 `onSubmit` 경계로 전달하고, 실제 저장 API 연결과 저장 성공·실패 UX는 `BE-RECIPE-003`, `FE-RECIPE-003`에서 구현한다.
- 시행착오: 자동 브라우저 화면 세션을 사용할 수 없어 390px 모바일 배치, 키보드 접근, 오류 초점과 취소 이동은 사용자가 수동으로 확인했다.
- 검증: 프론트엔드 전체 테스트 5개 파일·31개 테스트, `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 사용자가 390px 화면의 가로 넘침, 반복 항목 배치, 키보드 Focus, 경고·출처 계층과 취소 이동을 수동 확인했다.
- 후속: `BE-RECIPE-003`, `FE-RECIPE-003`
- 반복 패턴: 없음

## 2026-07-23 · COMMON-AI-002 · 완료

- 결과: 임의의 공개 제3자 YouTube 영상 자막 자동 수집을 MVP 지원 범위에서 제외하고, YouTube URL 수집 실패는 기존 `URL_FETCH_FAILED` 422와 직접 입력 안내로 처리하도록 문서를 정리했다. 이에 따라 자막 기반 구현 티켓 `BE-AI-003`은 범위 제외로 종료했다.
- 결정: 공식 YouTube Data API의 메타데이터만으로는 레시피 원문을 얻을 수 없고 자막에는 OAuth 및 영상 편집자 권한이 필요하다. 비공식 스크래핑이나 내부 엔드포인트는 채택하지 않으며 OAuth, API 키, 환경 변수, 의존성 및 새 오류 코드를 추가하지 않는다.
- 시행착오: 없음
- 검증: `git diff --check`와 관련 문서의 YouTube·`URL_FETCH_FAILED`·`BE-AI-003` 일관성 검색을 통과했다. 문서 전용 변경이므로 애플리케이션 테스트는 실행하지 않았다.
- 후속: 없음
- 반복 패턴: 없음

## 2026-07-23 · FE-AI-001 · 완료

- 결과: Firebase ID 토큰으로 AI 구조화 API를 호출하고 처리 중 중복 제출을 막으며, 실패 후 입력과 재시도를 유지한다. 검증된 초안은 `/recipes/draft`로 전달하고 새로고침·직접 접근 또는 빈 제목의 초안은 `/recipes/new`로 돌려보낸다.
- 결정: 초안은 저장 전 임시 데이터이므로 별도 영속화 없이 라우트 상태로 전달하고, 유효성 경계를 전용 Route 컴포넌트에서 적용한다.
- 시행착오: 테스트 격리와 기존 `onPrepare(null)` 호출이 Red 원인을 가려 명시적 cleanup과 제출 전 mock 설정으로 테스트 자체 문제를 제거했다. 일부 외부 URL은 수집 제한으로 422를 반환했고 비레시피 페이지는 AI 응답 검증에서 502로 거부됐으며, 지원 가능한 공개 페이지로 정상 흐름을 확인했다.
- 검증: 프론트엔드 테스트 3개 파일·7개 테스트, `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 실제 API로 직접 입력, URL 단독, URL·직접 입력 혼합 성공과 인증 실패 401, URL 수집 실패 422, AI 응답 실패 502 및 실패 후 재시도를 확인했다.
- 후속: `FE-AI-002`
- 반복 패턴: 없음

## 2026-07-23 · BE-AI-002 · 완료

- 결과: 인증된 사용자의 URL 단독 및 URL·직접 입력 혼합 요청을 안전하게 수집해 AI 구조화에 연결하고, 검증된 제출 URL과 수집한 제목·작성자를 편집용 초안의 출처로 반환한다. 수집 실패는 직접 입력을 안내하는 `URL_FETCH_FAILED`로 반환하며 결과는 자동 저장하지 않는다.
- 결정: `http`와 `https`만 허용하고 DNS 결과를 실제 연결 주소로 고정해 localhost, 사설·링크 로컬·예약 IP를 차단한다. DNS 조회와 각 HTTP 요청은 10초, Redirect는 3회, 응답은 1,048,576바이트, 추출 본문은 20,000자로 제한하며 Redirect 목적지를 매번 재검증한다. HTML은 Schema.org `Recipe`, `article`, `main` 순서로 범위를 제한하고 실행 콘텐츠를 제거한다.
- 시행착오: 최초 구현은 HTTP 연결 전에 수행하는 DNS 조회에 Timeout이 적용되지 않았고 전체 `body`를 추출하는 폴백이 남아 있어 각각 DNS Timeout과 레시피 본문 영역 필수화로 보완했다. 반복 공개 URL 검증 중 IANA가 일시적으로 2xx가 아닌 응답을 반환해 URL 수집과 AI 혼합 구조화를 분리해 확인했다.
- 검증: `backend npm test`의 5개 테스트, `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다. IANA 공개 URL과 HTTP→HTTPS Redirect 수집, 100바이트 응답 제한, 1ms Timeout, 차단 주소와 20,000자 본문 제한을 확인했고 실제 OpenAI 요청으로 URL 단독 및 혼합 입력의 제목·재료·단계와 서버 출처 주입을 확인했다.
- 후속: `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-22 · BE-AI-001 · 완료

- 결과: 인증된 사용자의 직접 입력을 `POST /api/ai/recipes/structure`에서 OpenAI Responses API로 구조화해 편집용 `RecipeDraft`와 `RecipeWarning`을 반환한다. URL 입력은 후속 티켓까지 거부하고 성공 결과는 데이터베이스에 저장하지 않는다.
- 결정: 요청 원문은 20,000자로 제한하고 사용자별 10분당 10회 제한과 15초 제공자 timeout을 적용한다. OpenAI strict JSON Schema 결과도 서버에서 필수 필드·타입·null·연속 순서와 경고 필드 경로 및 배열 범위를 다시 검증한다.
- 시행착오: OpenAI API 크레딧 부족으로 429 응답이 발생해 상태와 요청 ID만 기록하는 안전한 진단 로그로 원인을 확인했다. TypeScript가 콜백 안에서 `draft` 속성의 타입 좁히기를 유지하지 않아 검증된 배열 길이를 지역 변수로 보존해 경고 인덱스 검사에 전달했다.
- 검증: 실제 OpenAI 요청의 정상 구조화 결과를 확인했다. 빈 입력·20,000자 초과·URL 입력 400, 비인증 401, 사용자 제한 초과 429, 제공자 실패·timeout 502, 잘못된 JSON·응답 구조·경고 경로 502를 확인하고 `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다.
- 후속: `BE-AI-002`, `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-22 · COMMON-AI-001 · 완료

- 결과: 사용자가 승인한 OpenAI Responses API와 `gpt-5.6-luna`를 MVP AI 제공자·모델로 확정하고 백엔드 환경 변수, 요청 제한, 실패 정책과 AI 출력 검증 경계를 문서화했다.
- 결정: 구조화 출력에 `RecipeDraft`와 `RecipeWarning` 스키마를 적용하되 서버가 형식·업무 규칙을 다시 검증한다. AI 결과는 자동 저장하지 않고 사용자가 수정한 저장 요청을 별도로 검증한다.
- 시행착오: 공식 OpenAI 문서 MCP가 현재 세션에 없어 전역 MCP 서버를 등록했고, 이번 결정 근거는 공식 OpenAI 개발자 문서를 직접 확인했다.
- 검증: `git diff --check`, `backend npm run type-check`, `backend npm run build`를 실행했다. 의존성 변경이 없는지 `package.json` diff를 확인했다.
- 후속: `BE-AI-001`, `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-21 · FE-RECIPE-002 · 완료

- 결과: `/recipes/new` 보호 경로와 레시피 입력 폼을 구현했다. 데스크톱에서는 기존 목록 오른쪽 종이에 폼을 표시하고, 1100px 이하에서는 폼을 단일 종이 화면으로 전환한다. URL과 직접 입력은 둘 중 하나 이상과 `http`·`https` URL을 검증하며 `{ sourceUrl, rawText }` 형태로 다음 AI 연결 경계에 전달한다.
- 결정: 기존 목록·인증·책형 레이아웃을 재사용하고 AI API 호출과 저장은 `FE-AI-001` 이후 범위로 남겼다. 전달 초대 코드 진입은 일반 레시피 추가 폼과 분리한다.
- 시행착오: 없음
- 검증: `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 사용자가 데스크톱, 1100px 이하와 390px 화면, 추가·취소 이동, 빈 입력·URL만·직접 입력만·혼합 입력·잘못된 URL, 입력값 유지와 키보드 접근성을 수동 확인했다.
- 후속: `FE-AI-001`
- 반복 패턴: 없음

## 2026-07-20 · FE-RECIPE-001 · 부분 완료

- 결과: 레퍼런스의 `rb-book`, `rb-sidebar`, 두 종이 페이지와 반응형 구조 안에 현재 목록 API 조회, 필터, 카드, 로딩·오류·빈 상태를 구현했다. 책 프레임은 10px 패딩 내부의 명시적인 Grid 행을 채우며, 9-slice 가죽 프레임과 금박 책 엠블럼을 포함한 레퍼런스 스타일을 Tailwind 유틸리티로 관리한다.
- 결정: 오른쪽 종이는 상세와 추가 기능이 준비될 때까지 비워 둔다. 레퍼런스에 배치 규칙이 없는 금박 장식과 아직 없는 음식 이미지·아이콘은 연결하지 않는다.
- 시행착오: 없음
- 검증: `frontend npm run lint`, `frontend npm run build`, `git diff --check`를 통과했다. 인증된 실제 API 응답은 로컬 Firebase·백엔드 연결이 필요해 수동 확인하지 못했다.
- 후속: `DB-SHARE-001`, `FE-RECIPE-002`, `BE-RECIPE-004`, `FE-RECIPE-004`, `FE-RECIPE-001`
- 반복 패턴: 없음

## 2026-07-20 · BE-RECIPE-002 · 부분 완료

- 결과: `GET /api/recipes`가 Firebase UID로 현재 서비스 사용자를 식별해 PostgreSQL의 활성 `OWNED`, `EXTERNAL` 레시피를 생성일 내림차순으로 조회하고, 출처와 `RecipeSummary` 필드를 반환한다.
- 결정: 공유 관계 테이블이 `DB-SHARE-001` 범위이므로, 사용자 결정에 따라 해당 기능 전까지 `RECEIVED` 레시피를 목록에서 제외한다. 공유 구현 시 `receivedInfo` 조회를 추가해 티켓의 남은 완료 조건을 처리한다.
- 시행착오: 없음
- 검증: `backend npm run type-check`, `backend npm run build`, `git diff --check`를 통과했다. 자동 테스트 스크립트는 없다.
- 후속: `DB-SHARE-001`, `BE-RECIPE-002`
- 반복 패턴: 없음

## 2026-07-20 · FE-AUTH-003 · 완료

- 결과: Firebase 인증 확인 중 상태를 제공하고, 비로그인 사용자의 보호 경로 접근을 로그인 화면으로 보내며, 로그인 성공 후 원래 레시피 목록 또는 전달 링크 경로로 복귀한다.
- 결정: 프론트엔드 인증 상태는 `AuthProvider`에서 Firebase `onAuthStateChanged`로 관리한다. 복귀 경로는 Router state의 앱 내부 상대 경로만 허용한다.
- 시행착오: Provider와 hook을 분리해 Fast Refresh lint 규칙을 지켰고, 로그인 이동 경로의 중복 import와 경로 오타를 수정했다.
- 검증: 로그아웃 상태의 `/recipes`, `/transfer-invitations/test-token` 접근 후 로그인 복귀와 인증 확인 중 로딩 상태를 수동 확인했고, `frontend npm run lint`, `frontend npm run build`, `git diff --check` 성공을 확인했다.
- 후속: `FE-RECIPE-001`, `QA-AUTH-001`
- 반복 패턴: 없음

## 2026-07-19 · FE-AUTH-002 · 완료

- 결과: Google 로그인 처리 중 중복 클릭을 막고, 실패 메시지와 재시도를 제공하며, `/api/auth/me` 확인 뒤 레시피 목록 경로로 이동한다.
- 결정: 실제 레시피 목록 UI가 구현되기 전까지 `/recipes`에는 최소 임시 화면을 제공하고, `FE-RECIPE-001`에서 교체한다.
- 시행착오: 로그인 화면에 남아 있던 `setRecipes` 미정의 호출과 표시되지 않던 오류 상태를 제거했다.
- 검증: Google 로그인 시도부터 `/recipes` 임시 화면 이동까지 수동 확인, `frontend npm run lint`, `frontend npm run build`, `git diff --check` 성공을 확인했다.
- 후속: `FE-AUTH-003`, `FE-RECIPE-001`, `QA-AUTH-001`
- 반복 패턴: 없음

## 2026-07-18 · BE-AUTH-002 · 완료

- 결과: Firebase ID 토큰으로 식별한 사용자를 PostgreSQL `users`에 생성하거나 갱신하고, `/api/auth/me`가 내부 사용자 ID를 포함한 `CurrentUser`를 반환한다.
- 결정: Firebase는 인증과 UID 검증만 담당하며, 서비스 데이터와 레시피 소유권은 내부 `users.id`로 관리한다. Firebase UID는 연결 키로만 사용하고 이메일은 식별 키로 사용하지 않는다.
- 시행착오: 없음
- 검증: 무토큰 `/api/auth/me` 요청의 `401 UNAUTHORIZED`, 첫 Google 로그인 시 사용자 생성, 같은 계정 재로그인 시 동일 내부 ID 유지, `backend npm run type-check`, `backend npm run build`, `git diff --check`를 확인했다.
- 후속: `FE-AUTH-002`, `BE-RECIPE-002`, `BE-AI-001`, `QA-AUTH-001`
- 반복 패턴: 없음

## 2026-07-18 · DB-CORE-001 · 완료

- 결과: `pg` 기반 PostgreSQL 연결, 순차 SQL 마이그레이션과 핵심 레시피 테이블·제약·인덱스를 추가했다.
- 결정: 현재 규모에서는 ORM 없이 `pg` Pool과 매개변수화한 SQL을 사용한다. 사용자 삭제는 `RESTRICT`, 레시피 하위 데이터와 출처 삭제는 `CASCADE`로 처리한다. 로컬 IPv6 제약에서는 Supabase IPv4 호환 pooler URL을 사용한다.
- 시행착오: Supabase 직접 연결 URL이 IPv6 주소로 해석되어 `ETIMEDOUT`이 발생했고, IPv4 호환 pooler URL로 전환해 해결했다.
- 검증: `backend npm run migrate`를 두 번 실행해 최초 적용과 재실행 건너뛰기를 확인했고, `backend npm run type-check`, `backend npm run build`, 실제 DB 연결 서버 기동, `git diff --check`를 확인했다.
- 후속: `BE-AUTH-002`, `BE-RECIPE-002`, `BE-RECIPE-003`, `DB-SHARE-001`
- 반복 패턴: 없음

## 2026-07-16 · BE-SETUP-002 · 완료

- 결과: 단일 환경 변수 기반 CORS 정책과 100KB JSON 본문 제한을 Express 공통 경계에 적용했다.
- 결정: `CORS_ALLOWED_ORIGIN`이 요청 Origin과 정확히 일치할 때만 교차 출처를 허용하며, 쿠키 credentials는 사용하지 않는다.
- 시행착오: 없음
- 검증: `backend npm run type-check`, `backend npm run build`, 허용·비허용 Origin preflight, 잘못된 JSON 400, 본문 초과 413, `git diff --check`를 확인했다.
- 후속: `DB-CORE-001`, `BE-AUTH-002`, `BE-AI-001`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-API-001 · 완료

- 결과: 프론트엔드 요청을 공통 API 모듈로 통일하고 health·레시피·공통 오류 응답을 `{ data }`와 `{ error }` 계약으로 정리했다.
- 결정: 일반 API 경로의 404는 `API_NOT_FOUND` 코드로 반환하며 API 명세와 데이터 모델의 주요 오류 코드에 함께 기록한다.
- 시행착오: 프론트엔드 lint에는 `setRecipes` 미정의와 화면에 표시되지 않는 오류 상태가 남아 있어 `FE-AUTH-002`로 유지했다.
- 검증: `frontend npm run build`, `backend npm run type-check`, `backend npm run build`, health·404 HTTP envelope 확인, 직접 `fetch` 제거, `git diff --check`를 확인했다.
- 후속: `FE-AUTH-002`, `BE-AUTH-002`, `BE-AI-001`, `BE-RECIPE-003`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-ASSET-001 · 완료

- 결과: 로그인 버튼이 참조하는 공개 경로에 가죽 질감 PNG를 추가해 프로덕션 빌드의 에셋 경고를 해소했다.
- 결정: 기존 `/design-assets/cookbook/leather-texture-tile.png` 참조와 사용자 제공 원본 이미지를 그대로 유지한다.
- 시행착오: 없음
- 검증: PNG 서명·크기 확인과 `frontend npm run build`를 실행했고 에셋 경고 없이 성공했다.
- 후속: `COMMON-API-001`, `FE-AUTH-002`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-SETUP-002 · 완료

- 결과: README에 프론트엔드·백엔드 의존성 설치, Firebase 환경 변수, 로컬 실행과 검증 명령을 기록했다.
- 결정: 로컬 프론트엔드는 Vite proxy를 사용하므로 `VITE_API_BASE_URL`을 생략하고, 분리 배포에서만 백엔드 origin을 설정한다.
- 시행착오: 프론트엔드 lint는 기존 `apiClient`와 로그인 화면 오류로 실패해 관련 티켓 범위로 남겼다.
- 검증: `.env` 파일의 Git 제외 규칙과 미추적 상태를 확인했고, `frontend npm run build`, `backend npm run type-check`, `backend npm run build`가 성공했다.
- 후속: `COMMON-API-001`, `FE-AUTH-002`, `COMMON-ASSET-001`
- 반복 패턴: 없음

## 2026-07-16 · COMMON-DOCS-002 · 완료

- 결과: 온보딩과 입력 범위를 Google 로그인 및 URL·직접 입력 정책에 맞추고, 조리 팁을 후속 범위로 통일했으며 세 데이터 문서의 테이블과 관계를 일치시켰다.
- 결정: Firebase ID 토큰은 요청마다 검증하고 서버 세션을 저장하지 않으며, 서비스 사용자는 `users.firebase_uid`로 식별한다.
- 시행착오: ERD 문서 목록에서 빠진 `sessions` 엔터티와 관련 컬럼·관계·인덱스가 JSON 컬렉션에 남아 있어 참조 단위로 함께 제거했다.
- 검증: ERD JSON 파싱·참조 무결성·canonical 테이블 목록, 과거 명칭과 제외 기능 검색, 체크리스트 상태 및 `git diff --check`를 확인했다.
- 후속: `DB-CORE-001`
- 반복 패턴: 없음

## 2026-07-15 · COMMON-SETUP-003 · 완료

- 결과: 44개 고유 티켓과 완료 조건, 프로젝트 컨텍스트·이력·스킬 후보 문서, `run-project-ticket` 스킬을 연결했다.
- 결정: 티켓은 안정적인 영역·기능 ID를 사용하고, 모든 구현 결과를 기록하며 같은 절차가 두 번째 반복될 때만 스킬화를 제안한다.
- 시행착오: Windows에서 스킬 초기화 시 한글 UI 메타데이터 인코딩과 보호된 `.agents` 쓰기 권한 문제가 발생해 UTF-8 스테이징 파일을 승인된 경로에 복사했다.
- 검증: 티켓 ID 중복·선행 참조·순환 의존성·완료 상태 검사를 통과했고 `quick_validate.py`가 `Skill is valid!`를 반환했다.
- 후속: `COMMON-DOCS-002`, `COMMON-API-001`
- 반복 패턴: 없음
