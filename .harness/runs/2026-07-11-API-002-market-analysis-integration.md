# Run Report: API-002 market analysis integration

## Summary

```text
Task: API-002 / WEB-001 / WEB-007
Status: partial
Date: 2026-07-11
```

## Scope

```text
canonical SQLite를 읽는 market analysis repository와 FastAPI endpoint를 구현했다.
3개 상권 x 4개 업종의 공식-data snapshot을 생성했다.
제품 UI가 API를 우선 사용하고 정적 배포에서는 같은 DB snapshot으로 fallback한다.
```

## Verification

```text
API: 28 tests passed, Ruff passed.
Front: 4 tests, lint, TypeScript와 production build passed.
Actual endpoint: 연남 카페 64개, 유동 1,013,523명/분기, score 39.5, confidence 49.6.
Browser: 카페 64개/점수 40 -> 베이커리 18개/점수 28 전환 확인.
Evidence modal: confidence 49.6%, 특화상권 판단 보류, 긍정·주의 근거와 누락 지표 표시 확인.
```

## Known Limitations

```text
confidence 49.6은 매출 성장·생존율·접근성 지표가 없어 insufficient_evidence다.
분석 집계는 서울시 상권 경계이며 지도 반경 selector의 원형 query가 아니다.
개별 점포는 OSM POI snapshot이고 개별 성공 점수를 제공하지 않는다.
```

## Next Action

```text
점포 좌표와 상권 좌표계를 WGS84로 통일한다.
100m/300m/500m 공간 query와 source-aware empty state를 구현한다.
```
