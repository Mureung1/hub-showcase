# Task Packet: EVAL-002

## 1. Summary

```text
Task: Front-API 통합 smoke test와 오류 상태
Backlog ID: EVAL-002 / API-003 / WEB-005
GitHub Issue: #27
Jira: LT-10 (Parent: LT-7)
Parent Epic: EPIC-06
Type: test
Owner: N187_정현우
Status: done
Depends on: MAP-005, ANALYSIS-002, WEB-002, WEB-003
```

## 2. Goal

새 환경에서 React → FastAPI → development Supabase의 핵심 지도 흐름을 반복 실행하고, 정상·빈 결과·잘못된 입력·DB 장애를 서로 다른 화면 상태로 확인한다.

## 3. Scope

포함:

- 검색 → 결과 선택 → 지도/분석 갱신
- 분석 위치 이동 → 반경 확정 → 주변 점포 갱신
- URL·filter·원·marker·목록·패널의 동일 state 검증
- loading·empty·validation·unsupported area·service unavailable·retry 검증
- basemap과 지원 지역 Overlay 회귀
- DB 경로·credential·stack trace 비노출 확인

제외:

- 공개 production 배포
- 인증·privacy 보안 Epic 전체
- 성능 부하 시험
- 서울 전체 검색

## 4. Related Documents

- `docs/features/market-map-experience.md`
- `docs/features/market-analysis.md`
- `docs/development/tasks.md`
- `.harness/tasks/MAP-005-base-map-supported-overlays.md`
- `.harness/tasks/ANALYSIS-002-radius-search.md`

## 5. Expected Changes

```text
api tests: nearby 정상·경계·validation·DB failure contract
web tests: loading·empty·error·retry·stale request와 URL 동기화
browser smoke: 실제 development Supabase를 쓰는 핵심 경로
docs: 실행 조건, 환경변수 이름, 결과와 남은 제한
```

실행 순서:

```text
1. API health와 DB 연결 확인
2. 연남·홍대·합정 검색 fixture 확인
3. 점포 선택 후 지도 중심·분석 panel 확인
4. 100/300/500m 반경 결과와 URL 확인
5. 지원 밖 좌표, 빈 결과와 DB 장애를 각각 재현
6. retry 뒤 정상 state 복구 확인
7. 지원 영역 밖 basemap과 내부 Overlay 회귀 확인
```

## 6. Acceptance Criteria

- [x] 실제 development Supabase로 검색과 nearby endpoint가 HTTP 200을 반환한다.
- [x] 검색 결과 선택 후 지도 중심·목록·분석 panel이 같은 store/market ID를 사용한다.
- [x] 위치 확정과 반경 변경이 URL·request·원·marker·수치에 동일하게 반영된다.
- [x] loading, empty, validation, unsupported area와 503이 서로 다른 사용자 문구를 가진다.
- [x] 이전 요청이 늦게 끝나도 최신 선택 state를 덮어쓰지 않는다.
- [x] retry가 마지막 확정 request를 다시 실행하고 정상 화면으로 복구한다.
- [x] 오류 응답·화면·console에 DB URL, SQL, stack trace와 credential이 없다.
- [x] 지원 영역 밖 basemap과 지원 영역 안 Overlay가 함께 회귀 통과한다.
- [x] 실행 명령과 결과를 Run Report에 기록한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check src tests
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
python scripts/check_task_packet.py --root . --require
python scripts/check_docs_html.py
git diff --check
```

수동 smoke는 실제 `DATABASE_URL`을 사용하되 값 자체를 log·문서·screenshot에 남기지 않는다.

## 8. Documentation Updates

- [x] `.harness/runs/<date>-EVAL-002-front-api-smoke.md`에 환경·시나리오·결과 기록
- [x] `docs/development/tasks.md`의 API-003, WEB-005, EVAL-002 상태 갱신
- [ ] Jira LT-10에 commit과 Run Report 링크 연결

## 9. Commit Plan

```text
test(integration): cover map radius workflow and error states
```

제품 동작 수정과 smoke test 추가가 함께 필요하면 기능 commit과 test/report commit을 분리한다.

## 10. Self-check

- [x] mock test만 통과하고 실제 DB smoke를 생략하지 않았는가?
- [x] API failure를 빈 결과로 숨기지 않았는가?
- [x] secret이나 개인 PC 경로를 evidence에 남기지 않았는가?
- [x] 늦은 응답의 stale state를 검증했는가?
- [x] basemap·Overlay 회귀를 함께 확인했는가?
