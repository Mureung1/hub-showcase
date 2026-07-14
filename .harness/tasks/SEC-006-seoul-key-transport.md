# Task Packet: SEC-006

## 1. Summary

```text
Task: Seoul API key 전송·log 보호
Backlog ID: SEC-006
Parent Epic: EPIC-07
Type: security
Owner: N187_정현우
Status: ready
```

## 2. Goal

공식 전송 경로를 재확인하고 key가 URL·proxy·application log에 남지 않게 한다.

## 3. Scope

- 공식 HTTPS 지원 확인과 날짜 기록
- HTTPS 또는 격리 collector 대안
- egress 제한과 log redaction
- 노출 가능 key rotation 절차

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/issues/security-hardening-review.md`
- `docs/development/validation.md`

## 5. Expected Changes

- API 또는 배포 경계의 최소 수정과 회귀 test
- 합성 fixture만 사용하고 실제 secret·촬영 원본은 기록하지 않음

## 6. Acceptance Criteria

- [ ] 승인된 전송 방식이 문서화된다.
- [ ] application·proxy log에 key가 없다.
- [ ] key가 browser bundle에 없다.
- [ ] 실제 key 없이 회귀 test가 통과한다.

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
fix(data): protect seoul api key transport
```

## 10. Self-check

- [ ] 수정 전 안전한 로컬 재현과 수정 후 차단 결과를 기록했다.
- [ ] 기존 market·score·web 흐름의 회귀 여부를 확인했다.
- [ ] secret, 내부 경로와 사용자 원본을 노출하지 않았다.