# Phase 00 — Discovery baseline

현재 controller가 지정한 `step_id` 하나만 수행한다. `phase.json`의 `allowed_paths` 밖은 수정하지 않고, 상태 파일이나 Attempt 기록을 직접 변경하지 않는다. 완료 여부는 controller의 acceptance check가 결정한다.

## 공통 기준

- 제품 기준은 `docs/PRD.md`이며 MVP와 Phase 2를 분리한다.
- 현재 존재하는 코드와 문서만 사실로 기록한다. 없는 기능을 구현됐다고 간주하지 않는다.
- 자동 수집·자동 게시·자동 신고·법률 판단은 MVP에서 제외한다.
- 미결정 사항은 합리적 기본값, 결정 시점, 차단 여부를 구분한다. 배포 자격증명처럼 실제 외부 입력이 필요한 항목만 차단 후보로 둔다.

## `baseline-audit`

`BASELINE.md`에 현재 구현 상태, 목표 사용자, 핵심 일상 루프, MVP 포함·제외 범위, 도메인·보안·개인정보·운영 공백을 근거 파일과 함께 적는다. `OPEN_DECISIONS.md`에는 생산 스택, 인증, 데이터 보존, LLM, 배포와 관측 결정을 나열하고 후속 Phase에서 결정할 항목과 사용자 입력이 꼭 필요한 항목을 구분한다.

## `prd-traceability`

`PRD_TRACEABILITY.md`에 PRD 2.1~2.5, S1~S4, 화면 ①~⑦, 리스크 요구사항을 고유 ID로 정리하고 담당 Phase·예상 산출물·검증 방법을 연결한다. `DELIVERY_PLAN.md`에는 00~08 Phase 의존 관계, 각 Phase의 종료 기준, 스테이징과 프로덕션의 차단 조건을 기록한다.

## 실패 보고

검증에 실패하면 관측된 현상, 실행한 검사, 실제 결과와 증거 경로를 먼저 보고한다. 원인은 근거가 있을 때만 가설 또는 확정으로 표시한다.
