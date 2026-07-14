# Task Packet: SEC-001

## 1. Summary

```text
Task: Scene API 제품 기본 차단, 인증과 객체 단위 인가
Backlog ID: SEC-001
Parent Epic: EPIC-07
Type: security
Owner: N187_정현우
Status: A verified / B backlog
```

## 2. Goal

A단계에서 제품 환경의 Scene API를 기본 차단하고, B단계에서 활성 환경의 사용자와 job 소유권을 검증한다.

## 3. Scope

- A단계: SCENE_API_ENABLED=false 기본값과 route gate
- A단계: market·score API 회귀 test
- B단계: current user 식별과 SceneJob owner_id
- B단계: job·retry·asset 객체 단위 인가
- B단계: 관리자 전용 toolchain 상세

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/issues/security-hardening-review.md`
- `docs/development/validation.md`

## 5. Expected Changes

- API 또는 배포 경계의 최소 수정과 회귀 test
- 합성 fixture만 사용하고 실제 secret·촬영 원본은 기록하지 않음

## 6. Acceptance Criteria

- [x] A단계 기본 설정에서 모든 Scene route가 404 또는 정책상 비노출이다.
- [x] A단계에서 market·score API는 정상 동작한다.
- [ ] B단계 무인증 요청이 401이다.
- [ ] B단계 다른 사용자 job 접근이 403 또는 정책상 404다.
- [ ] 관리자만 toolchain 상세를 조회한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check .
pnpm --dir product/apps/web test
python scripts/check_task_packet.py --require
git diff --check
```

관련 없는 GPU 학습이나 공개 서버 공격으로 취약점을 재현하지 않는다.

## 8. Documentation Updates

- [x] `docs/issues/security-hardening-review.md` 상태와 검증 기록을 갱신한다.
- [x] `docs/development/tasks.md` 상태를 실제 결과에 맞춘다.
- [x] A단계 완료 결과를 `.harness/runs/` Run Report로 남긴다.

## 9. Commit Plan

```text
fix(scene): disable scene routes by default
```

## 10. Self-check

- [x] 수정 전 안전한 로컬 재현과 수정 후 차단 결과를 기록했다.
- [x] 기존 market·score·web 흐름의 회귀 여부를 확인했다.
- [x] secret, 내부 경로와 사용자 원본을 노출하지 않았다.
