# Phase 02 — Architecture foundation

현재 `step_id`만 수행하고 manifest의 `allowed_paths`를 지킨다. 기존 사용자 변경을 보존하며 비밀값은 코드, 로그, 예제 환경 파일에 쓰지 않는다. controller가 명령의 실제 종료 코드와 산출물을 검증하므로 성공을 스스로 선언하거나 상태 JSON을 수정하지 않는다.

## `architecture-decisions`

생산 기준 기본 스택은 React + TypeScript 프론트엔드, FastAPI 기반 Python 백엔드, PostgreSQL이다. 네 계층(Presentation/Application/Domain/Infrastructure)을 유지하고 다음을 ADR로 확정한다.

- 소유권 검증이 포함된 인증과 세션 경계
- 마이그레이션, 트랜잭션, 백업·복원 가능한 데이터 계층
- 공급자 교체가 가능한 LLM adapter와 구조화 출력 후처리
- 컨테이너 기반 스테이징·프로덕션 배포, health/readiness, 로그·메트릭·알림과 롤백

기존 ADR-0001을 삭제하지 말고 새 ADR이 생산 구현 결정을 후속 채택했음을 README 목록에 반영한다.

## `application-scaffold`

- 프론트엔드와 백엔드를 별도 루트로 구성하고 각자 재현 가능한 lockfile·의존성 정의를 둔다.
- 백엔드는 설정, DB 연결, health/readiness, 오류 응답, 계층별 빈 모듈과 테스트 진입점을 만든다.
- 프론트엔드는 접근 가능한 기본 shell, 라우팅 진입점, API client 경계를 만든다.
- PostgreSQL 개발 서비스를 포함한 로컬 compose와 최소권한 환경변수 예시를 만든다.
- CI는 lint, typecheck, 단위 테스트와 build 실패를 숨기지 않는다.
- `config/env.example`에는 키 이름과 안전한 placeholder만 쓰고 실제 비밀은 넣지 않는다. 실제 `.env*` 경로는 만들거나 수정하지 않는다.

의존성 설치가 네트워크 문제로 실패하면 stderr의 민감정보를 제거한 증거와 retry 가능 여부를 보고한다.
