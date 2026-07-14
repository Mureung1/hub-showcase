# Task Packet: SEC-008

## 1. Summary

```text
Task: 정적 배포 security header와 화면 회귀
Backlog ID: SEC-008
Parent Epic: EPIC-07
Type: security
Owner: N187_정현우
Status: ready
```

## 2. Goal

제품과 문서 배포에 필요한 header를 적용하고 지도·문서·3D 기능 회귀를 확인한다.

## 3. Scope

- CSP·frame·content-type·referrer 정책
- 제품·문서 artifact별 header
- 허용 origin·asset 목록
- 지도·문서·3D smoke

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/issues/security-hardening-review.md`
- `docs/development/validation.md`

## 5. Expected Changes

- API 또는 배포 경계의 최소 수정과 회귀 test
- 합성 fixture만 사용하고 실제 secret·촬영 원본은 기록하지 않음

## 6. Acceptance Criteria

- [ ] 배포 응답에 승인된 header가 있다.
- [ ] CSP가 필요한 asset만 허용한다.
- [ ] 지도와 문서가 정상 로드된다.
- [ ] 3D 비활성/활성 정책별 smoke가 통과한다.

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
fix(deploy): add security headers and smoke checks
```

## 10. Self-check

- [ ] 수정 전 안전한 로컬 재현과 수정 후 차단 결과를 기록했다.
- [ ] 기존 market·score·web 흐름의 회귀 여부를 확인했다.
- [ ] secret, 내부 경로와 사용자 원본을 노출하지 않았다.