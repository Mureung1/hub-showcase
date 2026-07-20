# Task Packet: DOCS-005

## 1. Summary

```text
Task: 1km 반경 제거와 공개 Web·문서 상태 정합성
Backlog ID: DOCS-005
Type: documentation and contract audit
Status: done
Parent issue: GitHub #42
Issue: GitHub #56
```

## 2. Goal

제품 UI, URL, API와 문서가 지원 반경을 100m·300m·500m로 동일하게 안내하도록 하고, 과거
1km 실험 기록은 현재 지원 기능으로 오해되지 않게 표시한다.

## 3. Scope

포함:

- Web segmented control과 URL parser 대조
- API radius validation 대조
- `radius=1000` deep link fallback 검증
- backlog와 과거 Run Report 상태 표시
- 공개 Web 반경 smoke

제외:

- 500m 초과 광역 분석
- PostGIS 성능 최적화
- 임의 반경 slider

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-16-ANALYSIS-002-radius-search.md`
- `.harness/runs/2026-07-19-DOCS-005-radius-policy-consistency.md`
- GitHub #42, #56

## 5. Expected Changes

```text
backlog: 100m·300m·500m만 현재 contract로 기록
historical run: 1km를 제거 전 성능 실험으로 표시
current run: code·test·public smoke 근거 기록
```

## 6. Acceptance Criteria

- [x] UI·URL·API가 100m·300m·500m만 지원한다.
- [x] 오래된 `radius=1000` URL은 기본 300m로 복구된다.
- [x] API의 1km 직접 요청은 HTTP 422를 반환한다.
- [x] backlog에서 1km를 현재 지원 범위로 안내하지 않는다.
- [x] 과거 1km 성능 측정은 historical 기록임이 표시된다.
- [x] 공개 Web에 세 반경만 표시된다.

## 7. Verification Plan

```powershell
pnpm --dir product --filter @localtwin/web test -- features/analysis/analysisUrlState.test.ts
product/apps/api/.venv/Scripts/python.exe -m pytest product/apps/api/tests -k nearby
rg -n '1km|1000m' docs .harness --glob '*.md'
python scripts/check_task_packet.py --root . --require
```

## 8. Documentation Updates

- [x] backlog 지원 범위 수정
- [x] historical Run Report에 정책 변경 주석 추가
- [x] DOCS-005 Task Packet과 Run Report 작성
- [ ] GitHub #56 완료 상태 동기화

## 9. Commit Plan

```text
docs(analysis): align supported radius policy
```

## 10. Self-check

- [x] historical 측정값을 삭제하지 않고 현재 정책과 구분했는가?
- [x] UI만 보고 API contract를 추측하지 않았는가?
- [x] 사용자 소유 파일과 secret을 건드리지 않았는가?
