# Phase 06 — Production readiness

현재 controller가 지정한 step만 수행한다. 필요한 수정은 `allowed_paths` 안에서만 하고 검사 실패를 `|| true`, skip, mock 성공으로 숨기지 않는다. 이 Phase에서는 스테이징이나 프로덕션을 배포하지 않는다.

## `full-quality-gate`

로컬과 CI에서 같은 명령이 실행되도록 `scripts/verify.py`를 만든다. backend lint·typecheck·단위·통합·AI 안전, frontend lint·typecheck·단위·build·browser E2E를 포함하고 필수 도구가 없거나 테스트가 0개 수집되면 실패한다. flaky retry로 결정적 결함을 가리지 않는다. 생성 코드와 migration drift도 검사한다.

## `security-privacy-readiness`

- 인증 우회, IDOR와 매장 간 격리, CSRF/CORS, rate limit, 입력 크기·파일 형식, 경로 조작을 검사한다.
- LLM prompt injection과 출력 escaping, 로그의 리뷰 원문·닉네임·토큰 노출을 검사한다.
- secret scan과 Python·Node dependency audit를 실행하고 심각도 높은 미해결 취약점은 실패시킨다.
- 데이터 export·삭제, 보존 기간, 증거 파일 접근·삭제, 감사 기록과 사고 대응을 문서화·테스트한다.

## `reliability-rollback-readiness`

health와 readiness를 분리하고 DB·LLM 장애가 각각 어떻게 드러나는지 정의한다. forward migration과 rollback 또는 호환 가능한 roll-forward 전략, 백업 생성·격리 환경 복원 검증을 제공한다. deploy와 smoke 도구는 target을 명시적으로 받아야 하며 기본 target을 production으로 두지 않는다. `release preflight`는 프로덕션에 접속하지 않고 revision·artifact와 로컬 운영 준비만 검사하는 offline 명령으로 제공한다. 낮은 동시성의 현실적 부하·timeout·재시도·멱등성 검사를 추가한다.

운영 문서에는 배포, 마이그레이션, smoke, 관측, 알림 대응, 롤백 조건과 담당자 인계 항목을 명령 단위로 기록한다. 비밀값은 인자나 보고서에 출력하지 않는다.

실패 기록은 현상, 증거, 원인 평가, 수정 행동과 재검증을 분리한다.
