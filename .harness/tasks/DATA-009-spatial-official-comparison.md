# Task Packet: DATA-009

## 1. Summary

```text
Task: 개별 점포-상권 공간 결합과 공식 밀집 집계 비교
Backlog ID: DATA-009
Type: data quality
Status: done
Depends on: DATA-008
```

## 2. Goal

연남·홍대·합정 polygon에 공간 결합된 개별 점포와 서울시 공식 상권·업종별 집계를
같은 product category·분기 기준으로 비교하고, 차이를 숨기지 않고 보고한다.

## 3. Scope

포함:

```text
20254 official store_metrics와 4,548개 point-in-polygon links 비교
카페·음식점·베이커리·편의점 product category crosswalk
Markdown·JSON comparison CLI와 fixture regression test
```

제외:

```text
서울 전체 polygon 확대
공식 집계와 개별 점포 수를 강제로 일치시키는 보정
지원하지 않는 세부 업종의 분석 노출
```

## 4. Related Documents

```text
docs/data/data-source-mapping.md
docs/data/database-structure.md
docs/development/tasks.md
```

## 5. Expected Changes

```text
product_catalog: product category별 text crosswalk를 authoritative catalog에 둔다.
spatial_comparison: spatial linked stores와 official aggregate를 period별로 비교한다.
nearby_search: 같은 text crosswalk를 재사용한다.
```

## 6. Acceptance Criteria

- [x] 3개 지원 상권과 4개 product category의 spatial·official count를 비교한다.
- [x] 기준기간과 difference를 report에 표시한다.
- [x] 기준일·업종 체계·polygon 포함 규칙 차이를 limitation으로 표시한다.
- [x] fixture DB에서 category mapping과 difference 계산을 회귀 검증한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest tests/test_spatial_comparison.py tests/test_nearby_search.py
uv run --directory product/apps/api python -m localtwin_api.spatial_comparison --period 20254 --report-format markdown
```

## 8. Documentation Updates

- [x] actual 20254 comparison table과 command를 data mapping에 기록한다.
- [x] database structure와 backlog 상태를 갱신한다.

## 9. Commit Plan

```text
feat(data): compare spatial stores with official counts
docs(data): record spatial comparison evidence
```

## 10. Self-check

- [x] source 차이를 오류로 위장하거나 silent adjustment하지 않았는가?
- [x] 지원 범위를 3개 상권 밖으로 확대하지 않았는가?
- [x] nearby search와 comparison이 같은 category text crosswalk를 사용하는가?
- [ ] DATA-008 인허가 전체 적재 후 영업 상태 차이도 별도 비교할 것인가?
