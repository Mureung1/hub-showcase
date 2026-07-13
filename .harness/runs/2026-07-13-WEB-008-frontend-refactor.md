# Run Report: WEB-008

## Summary

```text
Task: FE 파일 구조 분리와 기능별 state 경계 정리
Status: passed
Date: 2026-07-13
Dependency change: apps/web 내부 refactor는 ARCH-002 물리 배포 분리 전에 안전하게 완료
```

## Boundaries

| 경계 | 책임 |
| --- | --- |
| `features/market/types.ts` | 상권 domain type |
| `features/market/model.ts` | 표시 계산과 순수 helper |
| `features/market/useMarketAnalysis.ts` | API server state, loading/error와 abort |
| `features/market/MarketFilters.tsx` | 검색 범위와 점포 선택 UI |
| `features/market/MarketInspector.tsx` | 선택 상권 분석 UI |
| `services/marketAnalysis.ts` | API 요청과 snapshot fallback |
| `App.tsx` | 화면 조합과 지도 interaction |

`App.tsx`는 53,084 bytes에서 41,791 bytes로 줄었다. 지도 layer와 evidence/compare dialog는 현재 한 화면에서 강하게 결합돼 있어 이번 작은 refactor에서 추가 분리하지 않았다.

## Verification

```powershell
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web test -- --run
pnpm --dir apps/web build
git diff --check
```

Result:

```text
typecheck passed
lint passed
7 tests passed across 2 files
production build passed
desktop browser: snapshot fallback, market/category/radius interaction passed
mobile 390x844: filter, map and inspector layout passed
```

Browser console의 API `502`는 API 서버를 띄우지 않은 검증에서 발생했고, 제품은 검증 snapshot으로 전환해 정상 분석 결과를 표시했다. favicon `404`는 기존 비기능 상태다.

## Follow-up

- [ ] ARCH-002에서 제품 source와 문서 배포 artifact를 물리 분리한다.
- [ ] SEARCH-001에서 현재 service/hook 경계에 PostgreSQL 검색 contract를 연결한다.
- [ ] bundle code splitting은 기능 리팩터링과 분리해 별도 성능 작업으로 다룬다.
