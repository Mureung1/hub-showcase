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

## 알려진 문제

| ID | 상태 | 내용 | 해결 티켓 |
| --- | --- | --- | --- |
| `CTX-006` | 해결됨 | `apiClient`에 헤더 변수 오타와 AbortError 비교 오류가 있고 로그인 컴포넌트가 직접 `fetch`를 사용한다. | `COMMON-API-001` |
| `CTX-007` | 해결됨 | 로그인 버튼이 존재하지 않는 `leather-texture-tile.png`를 참조한다. | `COMMON-ASSET-001` |
| `CTX-008` | 활성 | 로그인 흐름에 `setRecipes` 미정의와 화면에 표시되지 않는 오류 상태가 남아 있다. | `FE-AUTH-002` |
| `CTX-009` | 활성 | 레시피 API는 메모리 프로토타입이며 공통 응답과 데이터 계약을 완전히 따르지 않는다. | `DB-CORE-001`, `BE-RECIPE-002`, `BE-RECIPE-003`, `BE-RECIPE-004` |
| `CTX-010` | 해결됨 | 인증, 조리 팁, 파일 입력과 ERD에 관한 문서가 서로 일치하지 않는다. | `COMMON-DOCS-002` |
| `CTX-011` | 활성 | 현재 실행 환경에서 `.agents/skills` 생성·수정은 추가 승인이 필요할 수 있고, Windows에서 스킬 메타데이터는 UTF-8 인코딩을 확인해야 한다. | `COMMON-SETUP-003` |

## 관리 규칙

- 다음 작업에도 영향을 주는 사실만 추가한다.
- 기존 사실이 바뀌면 새 항목을 중복 추가하지 않고 기존 항목을 `대체됨`으로 바꾸며 대체 ID를 남긴다.
- 해결된 알려진 문제는 `해결됨`으로 바꾸고 해결 티켓을 기록한다.
