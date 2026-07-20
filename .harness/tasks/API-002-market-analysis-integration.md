# Task Packet: API-002 / WEB-001 / WEB-007

## 1. Summary

```text
Task: canonical market analysis API와 제품 UI 연결
Backlog ID: API-002 / WEB-001 / WEB-007
Parent Epic: EPIC-03 / EPIC-04
Type: feature
Owner: N187_정현우
Status: in_progress
```

## 2. Goal

연남·홍대·합정과 네 업종의 점포·매출·유동인구를 제품 runtime PostgreSQL에서 조회하고,
공식 점수와 출처를 제품 화면에 표시한다. canonical SQLite는 같은 응답의 import 원본과
회귀 검증 기준으로 유지한다.

## 3. Scope

포함:

```text
서울시 상권 경계 기준 업종 집계
peer percentile과 score 1.0.0 연결
FastAPI market endpoint
3개 상권 x 4개 업종 배포 snapshot
API 우선, snapshot fallback Front adapter
loading/error와 source 상태
```

제외:

```text
100m/300m/500m 원형 공간 query
개별 점포 성공 점수
주거·직장 인구의 근거 없는 대체값
Vercel 안에서 FastAPI 실행
```

## 4. Related Documents

```text
docs/features/market-analysis.md
docs/features/market-score-methodology.md
docs/development/architecture.md
```

## 5. Expected Changes

```text
api: SQLAlchemy runtime market repository와 versioned endpoint
web: API/snapshot adapter와 실제 지표 표시
data: 3개 상권 x 4개 업종 deploy snapshot
docs: 구현 경계와 반경 query 후속 기록
```

## 6. Acceptance Criteria

- [x] canonical SQLite에서 점포·매출·유동인구를 함께 조회한다.
- [x] 제품 endpoint가 SQLAlchemy session을 통해 PostgreSQL 호환 runtime schema를 조회한다.
- [x] canonical SQLite 응답과 runtime seed 응답이 동일하다.
- [x] 같은 category의 서울 peer 백분위를 score 1.0.0에 전달한다.
- [x] API가 raw, score, confidence, reason과 source URL을 반환한다.
- [x] 제품 UI가 API를 우선 사용하고 검증 snapshot으로 fallback한다.
- [x] 상권·업종 선택이 점포 수, 개폐업, 시간대 수요와 점수를 바꾼다.
- [x] fixture 개별 점포 점수를 실제 분석처럼 표시하지 않는다.
- [ ] 100m/300m/500m 반경별 점포·metric을 공간 query로 다시 계산한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest
uv run --directory product/apps/api ruff check .
pnpm --dir product/apps/web test
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
python product/scripts/build_market_analysis_snapshot.py
```

## 8. Documentation Updates

- [x] 상권 분석 기능 스펙에 현재 API 경로를 기록했다.
- [x] 아키텍처의 API와 fallback 흐름을 갱신했다.
- [x] 백로그에 완료와 미완료 경계를 반영했다.
- [x] Run Report를 작성했다.
- [x] runtime PostgreSQL 전환 결과를 `.harness/runs/2026-07-16-API-002-runtime-postgresql.md`에 기록했다.

## 9. Commit Plan

```text
feat(analysis): connect canonical market evidence
```

## 10. Self-check

- [x] 서울시 상권 경계와 지도 반경을 구분했는가?
- [x] 누락된 주거·직장 인구를 숫자로 추정하지 않았는가?
- [x] 낮은 confidence를 숨기지 않았는가?
- [x] Vercel fallback도 같은 DB 산출물인가?
- [x] FastAPI 제품 endpoint가 배포 artifact에 없는 SQLite 파일에 의존하지 않는가?
- [ ] 후속: WGS84 점포와 상권 polygon으로 반경 query를 구현한다.
