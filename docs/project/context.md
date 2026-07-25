# 현재 프로젝트 컨텍스트

다음 티켓에서도 계속 고려해야 하는 확정 결정과 알려진 문제만 기록한다. 작업 과정의 상세 내용은 `history.md`에 남긴다.

## 확정 결정

| ID | 상태 | 결정 | 근거 |
| --- | --- | --- | --- |
| `CTX-001` | 활성 | 핵심 흐름은 로그인 → 목록 → 추가 → AI 구조화 → 수정 → 저장 → 상세 순서로 우선한다. | `AGENTS.md`, `COMMON-DOCS-001` |
| `CTX-002` | 활성 | 초기 인증은 Firebase Google 로그인과 Firebase ID 토큰 검증만 사용한다. | `AGENTS.md`, `FE-AUTH-001`, `BE-AUTH-001` |
| `CTX-003` | 활성 | AI 결과는 자동 저장하지 않고 사용자가 수정하는 초안으로 반환한다. | `docs/api/api_spec.md` |
| `CTX-004` | 활성 | `RECEIVED` 레시피는 원본 수정과 재공유를 금지하고 개인 메모만 수정할 수 있다. | `docs/product/feature_spec.md` |
| `CTX-005` | 활성 | 공유와 삭제·복원은 P0 핵심 흐름 완료 후 진행한다. | `AGENTS.md`, `docs/product/checklist.md` |
| `CTX-012` | 활성 | 교차 출처 브라우저 요청은 `CORS_ALLOWED_ORIGIN`에 설정한 단일 프론트엔드 Origin만 허용하며, 미설정 시 허용하지 않는다. | `BE-SETUP-002` |
| `CTX-013` | 활성 | PostgreSQL 데이터 접근은 `pg` Pool과 매개변수화한 SQL을 사용하고, 순차 SQL 마이그레이션은 `npm run migrate`로 적용한다. 현재 Supabase 연결은 IPv4 호환 pooler URL을 `DATABASE_URL`에 설정하며, URL은 Git에 기록하지 않는다. | `DB-CORE-001` |
| `CTX-014` | 활성 | Firebase는 Google 로그인과 ID 토큰 검증만 담당한다. 서비스 사용자는 `users.firebase_uid`로 연결하며, 레시피 소유권과 API 응답에는 내부 `users.id`를 사용한다. | `BE-AUTH-002` |
| `CTX-015` | 활성 | 프론트엔드 인증 상태는 Firebase `onAuthStateChanged` 기반 `AuthProvider`로 관리한다. 보호 라우트는 로그인 화면으로 보낼 때 앱 내부 상대 경로만 `returnTo`으로 보존하고 로그인 성공 후 해당 경로로 복귀한다. | `FE-AUTH-003` |

| `CTX-016` | 활성 | `BE-RECIPE-002`의 목록 범위는 공유 데이터가 없는 현재 `OWNED`, `EXTERNAL` 활성 레시피까지다. `DB-SHARE-002`와 `BE-SHARE-003`에서 `RECEIVED`, `receivedInfo`와 상세 조회를 통합한다. | `BE-RECIPE-002`, `DB-SHARE-002`, `BE-SHARE-003` |
| `CTX-017` | 활성 | `/recipes/new`은 데스크톱에서 목록을 왼쪽에 유지하고 추가 폼을 오른쪽 종이에 표시하며, 1100px 이하에서는 폼을 단일 종이 화면으로 표시한다. 목록 카드와 저장 후 상세 이동은 `FE-RECIPE-004`에서 연결한다. | `FE-RECIPE-001`, `FE-RECIPE-002`, `FE-RECIPE-004` |
| `CTX-018` | 활성 | MVP AI 구조화는 OpenAI Responses API와 `gpt-5.6-luna`를 사용한다. 구조화 출력은 서버에서 다시 검증하고, AI 결과는 자동 저장하지 않으며 사용자가 수정한 저장 요청을 별도로 검증한다. | `COMMON-AI-001` |
| `CTX-019` | 대체됨 | 직접 입력 전용 AI 구조화와 `sourceUrl` 거부 정책은 `BE-AI-002` 완료로 종료됐다. 대체 결정은 `CTX-020`이다. | `BE-AI-001`, `BE-AI-002` |
| `CTX-020` | 활성 | AI 구조화는 직접 입력, 안전하게 수집한 URL과 두 입력의 조합을 지원한다. URL 출처는 AI가 아닌 서버가 검증된 제출 URL과 수집한 제목·작성자로 설정하며, 직접 입력만 사용하면 `source`는 `null`이다. `warnings[].field` 검증 규칙은 계속 유지한다. | `BE-AI-001`, `BE-AI-002`, `FE-AI-001` |
| `CTX-021` | 대체됨 | 공개 YouTube 영상 자막 자동 수집을 지원하지 않는 정책은 `BE-AI-005` 예정 정책으로 대체됐다. | `COMMON-AI-002`, `BE-AI-005` |
| `CTX-022` | 활성 | 공개 `youtube.com`, `youtu.be` 영상은 YouTube Data API에서 제목·채널명을 조회하고 `youtube-transcript-api`로 공개 또는 자동 생성 자막을 한 번 조회한다. 자막 조회 실패 시 `gemini-3.6-flash`가 원본 URL·제목·채널명을 분석하고, 어느 경로든 기존 OpenAI가 최종 `RecipeDraft`를 구조화·검증한다. 프록시·쿠키·계정 인증·차단 우회와 영상·자막·썸네일 저장은 사용하지 않으며, 실패는 `URL_FETCH_FAILED` 422와 직접 입력 안내로 처리한다. | `BE-AI-005` |
| `CTX-023` | 활성 | 레시피 저장 성공 시 상세 API·화면이 준비되기 전까지 `/recipes`로 이동하며 `location.state.createdRecipeId`에 생성 ID를 보존한다. `FE-RECIPE-004`에서 이 ID를 실제 상세 경로 연결에 사용한다. | `FE-RECIPE-003`, `FE-RECIPE-004` |

## 알려진 문제

| ID | 상태 | 내용 | 해결 티켓 |
| --- | --- | --- | --- |
| `CTX-006` | 해결됨 | `apiClient`에 헤더 변수 오타와 AbortError 비교 오류가 있고 로그인 컴포넌트가 직접 `fetch`를 사용한다. | `COMMON-API-001` |
| `CTX-007` | 해결됨 | 로그인 버튼이 존재하지 않는 `leather-texture-tile.png`를 참조한다. | `COMMON-ASSET-001` |
| `CTX-008` | 해결됨 | 로그인 흐름에 `setRecipes` 미정의와 화면에 표시되지 않는 오류 상태가 남아 있었다. | `FE-AUTH-002` |
| `CTX-009` | 해결됨 | 목록·생성·상세 API의 메모리 프로토타입을 PostgreSQL 경로로 교체했다. 상세 조회는 Firebase UID 소유권과 활성 상태를 DB에서 함께 검사한다. | `BE-RECIPE-001`, `BE-RECIPE-003`, `BE-RECIPE-004` |
| `CTX-010` | 해결됨 | 인증, 조리 팁, 파일 입력과 ERD에 관한 문서가 서로 일치하지 않는다. | `COMMON-DOCS-002` |
| `CTX-011` | 활성 | 현재 실행 환경에서 `.agents/skills` 생성·수정은 추가 승인이 필요할 수 있고, Windows에서 스킬 메타데이터는 UTF-8 인코딩을 확인해야 한다. | `COMMON-SETUP-003` |

## 관리 규칙

- 다음 작업에도 영향을 주는 사실만 추가한다.
- 기존 사실이 바뀌면 새 항목을 중복 추가하지 않고 기존 항목을 `대체됨`으로 바꾸며 대체 ID를 남긴다.
- 해결된 알려진 문제는 `해결됨`으로 바꾸고 해결 티켓을 기록한다.
