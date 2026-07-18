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
