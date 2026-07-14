# Task Packet: SEC-005

## 1. Summary

```text
Task: 사용자·관리자 response schema 분리
Backlog ID: SEC-005
Parent Epic: EPIC-07
Type: security
Owner: N187_정현우
Status: ready
```

## 2. Goal

공개 API 응답에서 worker 경로, command와 상세 exception을 제거한다.

## 3. Scope

- public DTO 최소화
- admin diagnostics 분리
- 안전한 error code
- server log redaction

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/issues/security-hardening-review.md`
- `docs/development/validation.md`

## 5. Expected Changes

- API 또는 배포 경계의 최소 수정과 회귀 test
- 합성 fixture만 사용하고 실제 secret·촬영 원본은 기록하지 않음

## 6. Acceptance Criteria

- [ ] 공개 응답에 path·command·traceback이 없다.
- [ ] 관리자 진단 경로에 권한 검사가 있다.
- [ ] 운영 log로 필요한 진단이 가능하다.
- [ ] response snapshot test가 통과한다.

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

- [ ] `docs/issues/security-hardening-review.md` 상태와 검증 기록을 갱신한다.
- [ ] `docs/development/tasks.md` 상태를 실제 결과에 맞춘다.
- [ ] 완료 시 `.harness/runs/` Run Report를 남긴다.

## 9. Commit Plan

```text
fix(api): redact internal scene diagnostics
```

## 10. Self-check

- [ ] 수정 전 안전한 로컬 재현과 수정 후 차단 결과를 기록했다.
- [ ] 기존 market·score·web 흐름의 회귀 여부를 확인했다.
- [ ] secret, 내부 경로와 사용자 원본을 노출하지 않았다.