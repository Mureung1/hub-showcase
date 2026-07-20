# Task Packet: WEB-015

## 1. Summary

```text
Task: 운영 API 오류와 Demo snapshot 표시 정책 분리
Backlog ID: WEB-015
Type: frontend reliability
Status: in_progress
Depends on: SEARCH-001, WEB-010, DEPLOY-002
```

## 2. Goal

운영 API 실패를 정적 snapshot 결과로 숨기지 않고 loading, empty, error와 명시적인 Demo data를
사용자가 구분하도록 한다.

## 3. Scope

포함:

- production 분석 API 실패 시 자동 snapshot fallback 제거
- `VITE_DEMO_MODE=true`일 때만 검증 snapshot 허용
- API error와 retry UI
- 오류 시 정적 점수·그래프·점포 숨김
- API와 Demo source 문구 분리

제외:

- Render·Vercel release 설정 변경
- provider 자체 장애 복구
- 분석 기간 선택
- 모바일 panel 구조 변경

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/tasks/DEPLOY-002-production-database-promotion.md`
- `.harness/tasks/EVAL-002-front-api-smoke.md`
- GitHub Issue `#51`

## 5. Expected Changes

```text
service: API와 명시적 Demo snapshot 경로 분리
hook: 분석 retry token과 source state
web: error alert, retry, 가짜 분석 값 차단
tests: API 503 no-fallback과 명시적 Demo 회귀
```

## 6. Acceptance Criteria

- [x] production 기본값에서 API 실패를 snapshot으로 바꾸지 않는다.
- [x] Demo snapshot은 명시적인 환경변수에서만 사용한다.
- [x] API error, unsupported와 Demo source 문구가 구분된다.
- [x] 오류 화면에 다시 시도 동작이 있다.
- [x] 오류 시 입지 점수·시간대 그래프·분석 요약을 표시하지 않는다.
- [x] FE test·typecheck·lint·build가 통과한다.
- [x] 로컬 브라우저에서 실패 화면을 검증한다.
- [x] 최신 Web을 공개 배포하고 Render API와 함께 smoke test한다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
python scripts/check_task_packet.py --root . --require
git diff --check
```

공개 배포 뒤에는 Vercel에서 정상 API 결과, 강제 실패, retry 복구를 각각 확인한다.

## 8. Documentation Updates

- [x] WEB-015 Task Packet 작성
- [x] local Run Report 작성
- [ ] 공개 배포 smoke 결과 기록
- [ ] GitHub #51 완료 상태 동기화

## 9. Commit Plan

```text
fix(web): separate API errors from demo data
docs(web): record WEB-015 public smoke
```

## 10. Self-check

- [x] 운영 오류를 정상 데이터처럼 보이게 하지 않는가?
- [x] Demo mode를 사용자가 알아볼 수 있는가?
- [x] retry가 같은 API 요청을 다시 실행하는가?
- [x] 오류 메시지에 DB 정보와 stack trace가 없는가?
- [x] 기존 search·nearby 오류 상태를 덮어쓰지 않는가?
- [ ] 공개 배포가 최신 commit을 사용한다고 확인했는가?
