# Phase 07 — Staging release

이 Phase의 외부 변경 권한은 스테이징으로만 제한된다. release candidate step은 선언된 비밀이 아닌 production target·public domain·monitoring 및 controller adapter 식별자를 문서화할 수 있지만 프로덕션에 접속하거나 production credential을 읽지 않는다. `deploy`, `infra`, `scripts/deploy.py`, `scripts/smoke.py`, `scripts/verify.py`, E2E test와 그 밖의 실행 파일은 Phase 06에서 검증된 읽기 전용 입력이다. 임시 수정 후 복원하는 행위도 금지한다. 현재 step의 `allowed_paths`에 선언된 운영 증거만 만들고 실제 revision·URL·명령 결과를 정제해 기록한다. controller가 배포·검증 상태를 소유한다.

## `staging-deployment`

- Worker가 시작되기 직전 controller가 제공한 Phase 06 checkpoint commit을 `revision`으로 고정한다. branch, tag, `latest`, workspace 상태 또는 배포 후의 문서 commit을 revision으로 기록하지 않는다.
- `source_tree_oid`는 `git rev-parse <revision>^{tree}`의 정확한 tree OID이고, `source_tree_digest`는 UTF-8 문자열 `git-tree:<source_tree_oid>`의 SHA-256 소문자 hex다.
- 같은 revision에서 이미 만들어진 content-addressed artifact만 배포한다. `artifact_reference`는 tag가 아닌 registry/object-store의 immutable digest reference이고 `artifact_digest`는 실제 배포 payload bytes 또는 registry manifest가 반환한 canonical digest다. 재빌드한 결과나 사람이 입력한 digest는 허용하지 않는다.
- `deployment_manifest_digest`, `deploy_adapter_digest`, `deployment_verifier_digest`, `smoke_verifier_digest`는 해당 revision의 검증된 Git blob/tree 또는 배포 bundle에서 계산한다. `deploy_adapter_id`와 `deploy_adapter_digest`는 Controller의 staging adapter 설정과 정확히 같아야 한다. 현재 workspace에서 새로 고친 script·infra는 사용하지 않는다.
- 스테이징 자격증명은 환경 또는 비밀 저장소에서만 읽고 인자, stdout, JSON, Markdown에 쓰지 않는다.
- 배포 전 migration 계획과 백업 가능 상태를 확인하고 안전한 migration 후 health/readiness를 기다린다.
- adapter가 반환한 append-only receipt의 비밀이 아닌 `deployment_receipt_id`와 exact-byte SHA-256인 `deployment_receipt_digest`를 기록하고 read-after-write 조회로 revision·artifact digest·target을 다시 확인한다.
- `staging-release.json`에는 `environment: staging`, 입력과 정확히 같은 `target`·`url`, 성공 `status`, 위 revision/tree/artifact/adapter/verifier/receipt digest, 배포 시각만 기록한다. 모든 digest는 알고리즘 접두사 또는 고정 길이를 포함해 모호하지 않아야 한다.
- 배포 실패는 이전 정상 revision을 보존하고 자동 retry 가능 범주와 rollback 필요 여부를 구분한다.

## `staging-validation-rollback`

실제 배포 URL에서 health/readiness, 로그인·매장 격리와 S1~S4를 검증한다. 테스트와 smoke 실행물은 읽기 전용이며 이 step에서 고치지 않는다. 테스트 데이터는 스테이징 전용 가상 데이터이며 정리 가능해야 한다. 외부 배민 게시·신고는 호출하지 않고 안내와 clipboard 경계까지만 검사한다. 로그·메트릭·알림 연결과 rollback 리허설을 수행하고, 복구된 revision과 데이터 호환성을 확인한다. 검증 코드가 부족하거나 실패하면 release 코드를 수정하지 말고 step을 실패시켜 Phase 06 수정으로 되돌린다.

## `production-release-candidate`

스테이징에서 검증한 exact `revision`, `source_tree_oid`, `source_tree_digest`, immutable `artifact_reference`와 `artifact_digest`를 byte-for-byte 복사한다. `staging_release_digest`는 checkpoint에 커밋된 `staging-release.json` 파일 전체 UTF-8 bytes의 SHA-256이다. Candidate revision은 staging receipt의 revision과 같아야 하고 artifact digest는 staging receipt와 같아야 한다. `source_tree_digest`는 반드시 `SHA256(UTF8("git-tree:" + git_tree_oid(revision)))`로 다시 계산해 일치시킨다.

Candidate에는 deployment manifest·repo deploy adapter·deployment verifier·smoke verifier digest와 `production-adapter-id`, `production-adapter-digest`, `production-receipt-key-id`, `production-receipt-source`도 고정한다. 이 값은 phase input과 정확히 같아야 한다. offline preflight는 누락, tag reference, revision/tree 불일치, staging evidence digest 불일치, 실행 파일/infra digest 불일치를 모두 non-zero로 거부해야 한다. 백업·migration 호환성·수동 rollback 절차·DNS/TLS·대시보드·알림·담당자 준비를 로컬 자료로 검사한다.

이 step은 네트워크와 프로덕션 권한 없이 실행하며 실제 DNS 조회, 프로덕션 preflight API, 자격증명 확인이나 배포를 하지 않는다. `production-candidate.json`과 preflight 문서 이외의 파일은 수정하지 않는다. Controller 승인 challenge가 현재 구현에서 직접 바인딩하는 핵심 범위는 revision/source tree/artifact/target/domain/monitoring이므로, 그 밖의 adapter·verifier 필드는 offline preflight와 이후 signed receipt 검증에서 반드시 재검증한다.

오류 기록은 HTTP 상태·check ID·시간·정제 로그 같은 현상과 코드·인프라·외부 서비스 원인 평가를 분리한다.
