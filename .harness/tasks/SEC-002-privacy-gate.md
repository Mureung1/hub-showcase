# Task Packet: SEC-002

## 1. Summary

```text
Task: 서버 privacy 상태와 asset gate
Backlog ID: SEC-002
Parent Epic: EPIC-07
Type: security
Owner: N187_정현우
Status: ready
```

## 2. Goal

UI 안내가 아니라 서버가 승인된 anonymized asset만 반환하도록 강제한다.

## 3. Scope

- privacy_review_status 상태 모델
- 원본과 anonymized artifact 분리
- asset endpoint 승인 검사
- 승인·삭제 audit metadata

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/issues/security-hardening-review.md`
- `docs/development/validation.md`

## 5. Expected Changes

- API 또는 배포 경계의 최소 수정과 회귀 test
- 합성 fixture만 사용하고 실제 secret·촬영 원본은 기록하지 않음

## 6. Acceptance Criteria

- [ ] pending·rejected asset 다운로드가 차단된다.
- [ ] approved anonymized asset만 반환된다.
- [ ] 원본 경로가 공개 응답에 없다.
- [ ] 상태 전이와 회귀 test가 통과한다.

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
fix(privacy): enforce server asset gate
```

## 10. Self-check

- [ ] 수정 전 안전한 로컬 재현과 수정 후 차단 결과를 기록했다.
- [ ] 기존 market·score·web 흐름의 회귀 여부를 확인했다.
- [ ] secret, 내부 경로와 사용자 원본을 노출하지 않았다.