# Phase 08 — Production handoff

이 Phase는 `before_phase` 승인이 확인된 뒤에만 시작한다. 승인은 Phase 07에서 생성한 `production-candidate.json`의 exact revision·source tree·artifact digest·target·domain·monitoring 범위와 `approval_scope_digest`에 바인딩된다. Controller는 production 권한 step을 일반 Worker가 아니라 로컬 설정에 명시된 별도 production adapter argv로 실행하고, 실제 side effect 직전에 승인 scope를 다시 검증한다. 승인은 이 adapter의 선언된 배포와 read-only 관측 범위만 허용하며 임의의 명령이나 다른 target으로 확대되지 않는다.

`production-deployment`에서만 production credential과 external-side-effect 권한을 adapter에 전달한다. Adapter 설정, sandbox attestation, 승인 scope 또는 signed receipt 검증이 없거나 불일치하면 네트워크 변경 전에 fail-closed한다. 배포를 시작한 뒤 결과가 불명확하면 성공 자료를 합성하거나 자동 재시도하지 말고 `deployment_outcome_unknown`, `deployment_receipt_missing` 또는 `deployment_receipt_invalid` 현상으로 blocked 처리한다. `production-observation-handoff`는 같은 production adapter를 사용하지만 credential과 external-side-effect 권한 없이 read-only로 실행한다.

Production adapter와 그 뒤의 verifier 모두 `deploy`, `infra`, `scripts/deploy.py`, `scripts/smoke.py`, `scripts/verify.py` 및 모든 verifier executable을 읽기 전용으로 취급한다. 임시 수정 후 복원, wrapper·shadow executable 생성, PATH 변경도 금지한다. `allowed_paths`에 선언된 Markdown/JSON 운영 증거만 수정한다. 비밀값, 인증 헤더, 고객 원문을 로그·보고서·명령 인자에 남기지 않는다.

## `production-deployment`

Controller-owned production adapter는 다음 조건을 전부 확인한 뒤 정확히 한 번 배포하고 구조화 evidence를 만든다.

- Controller가 전달한 `approval_scope_digest`와 candidate exact-byte `candidate_digest`, revision, Git tree OID와 `SHA256(UTF8("git-tree:" + tree_oid))`, immutable artifact reference/digest, production target, public domain, monitoring target이 승인 challenge와 일치한다.
- 입력의 `production-adapter-id`, `production-adapter-digest`, `production-receipt-key-id`, `production-receipt-source`가 candidate의 대응 필드와 정확히 일치한다.
- Adapter는 candidate의 immutable artifact를 재빌드하거나 tag로 재해석하지 않고 digest로 배포한다. 호환 가능한 migration·점진적 rollout을 적용하고 health/readiness 전에는 트래픽을 전환하지 않는다.
- Receipt는 승인 시각 이후 adapter가 append-only source에 기록한 것이며 receipt ID·digest·서명, `approval_scope_digest`, adapter ID/digest, target, public domain, monitoring target, revision, source-tree digest, artifact reference/digest, migration outcome, deployed_at을 포함한다.
- Receipt 서명은 지정된 key ID로 검증되고, receipt ID의 재사용·replay·중복 배포가 없으며, live read-only 조회 결과가 동일 target·revision·artifact digest를 반환한다.
- `scripts/deploy.py production verify`는 위 계약을 모두 검사하는 read-only verifier여야 한다. verifier가 계약을 지원하지 않거나 실행 중 repo를 수정하면 배포 성공으로 간주하지 않는다.

`production-release.json`은 receipt 자체를 다시 작성하지 않고 비밀이 아닌 candidate/approval-scope/revision/tree/artifact/target/public-domain/monitoring/adapter/receipt digest, `receipt_signature_verified`, URL, deployed_at, verified_at과 상태를 기록한다. Controller 후검증은 receipt evidence의 revision·artifact digest·target·public domain·monitoring target·`approval_scope_digest`를 승인 challenge와 기계적으로 비교해야 한다. `PRODUCTION_RELEASE.md`에는 migration·health·traffic 상태와 수동 rollback 판단 근거를 기록한다. Critical health, migration, signature 또는 데이터 무결성 실패에서는 임의 자동 rollback을 실행하지 않고 failed 처리한다.

## `production-observation-handoff`

Production adapter의 read-only observation 모드로 공개 URL의 익명 health와 smoke를 수행한다. 이 step에는 production credential이나 external-side-effect 권한이 없다. Smoke/verifier script는 수정하지 않는다. 실제 고객 리뷰, 테스트 데이터 생성, 배민 게시·신고는 사용하지 않는다. 설정된 관측 창 동안 health/readiness, HTTP 오류율, latency, DB 연결, LLM 오류율, background task와 경보 전달을 확인한다. 관측한 target·revision·artifact digest가 verified receipt와 다르면 즉시 failed 처리한다. critical 경보는 failed 처리하고 수동 rollback 판단에 필요한 증거를 제공하며 `observed`로 승격하지 않는다.

인계 문서에는 공개 URL, 배포 revision·artifact·receipt digest, 대시보드, 경보·장애·롤백 절차, 데이터 백업 위치의 식별자, 담당 역할과 다음 점검 시점을 정리한다. 자격증명 값이나 내부 접근 토큰은 쓰지 않는다. 검증 코드나 infra 수정이 필요하면 이 Phase 안에서 고치지 말고 실패 기록을 남긴 뒤 Phase 06/07의 새 revision과 새 승인을 요구한다.

모든 실패는 관측 현상, 증거, 원인 평가, 수정·롤백 행동과 재검증을 분리해 기록한다.
