# Task Packet: DEMO-003

## 1. Summary

```text
Task: 금요일 발표 시나리오와 공개 제품 복구 경로
Backlog ID: DEMO-003 / DEMO-001
Jira: LT-16
Type: operations
Status: done
Depends on: EVAL-002, WEB-015, DEPLOY-002
```

## 2. Goal

발표자가 공개 LocalTwin을 시작 전 확인하고, Render Free API의 cold start 또는 API 오류가 있어도
데모의 신뢰도를 훼손하지 않는 방식으로 복구한다.

## 3. Scope

포함:

- 공개 Web·API 사전 확인
- 5분 발표 흐름
- Render API cold start 대기와 retry 절차
- API 오류와 지도 오류의 구분·복구 문구

제외:

- `/en` 제출용 데모 변경
- 무료 호스팅 provider 교체
- production DB migration

## 4. Related Documents

- `docs/development/environment.md`
- `.harness/tasks/WEB-015-api-error-demo-policy.md`
- `.harness/tasks/EVAL-002-front-api-smoke.md`
- `docs/development/tasks.md`

## 5. Expected Changes

```text
operations: 사전 점검 URL, 발표 순서, 장애별 복구 동선을 한 문서로 제공한다.
docs: DEMO-003 / DEMO-001 완료 상태와 실행 근거를 기록한다.
```

## 6. Acceptance Criteria

- [x] 공개 Web와 API readiness 확인 경로가 문서화된다.
- [x] 5분 안에 시연할 화면·조작·예상 결과가 순서대로 있다.
- [x] API cold start는 정적 분석값으로 위장하지 않고 준비 상태와 retry로 복구한다.
- [x] API·지도·브라우저 오류를 구분한 발표자 동선이 있다.
- [x] secret과 production credential이 문서에 없다.

## 7. Verification Plan

```powershell
curl.exe -fsS https://localtwin-api.onrender.com/ready
curl.exe -fsSI https://localtwin-product.vercel.app/
python scripts/check_task_packet.py --root . --require
python scripts/check_docs_index.py --root .
```

## 8. Documentation Updates

- [x] 공개 데모 runbook 작성
- [x] DEMO-003 Task Packet 작성
- [x] 개발 백로그 상태 갱신
- [ ] Jira LT-16에 runbook·공개 검증 결과를 수동으로 연결하고 완료 상태로 바꾼다.

## 9. Commit Plan

```text
docs(demo): add public presentation and recovery runbook
```

## 10. Self-check

- [x] 실제 API가 준비되기 전 분석 결과를 성공처럼 보이지 않는가?
- [x] 발표 전에 Render API를 미리 깨울 수 있는가?
- [x] 오류가 나도 어떤 화면으로 되돌아갈지 명확한가?
- [x] `/en` 경로를 수정 대상으로 포함하지 않았는가?
