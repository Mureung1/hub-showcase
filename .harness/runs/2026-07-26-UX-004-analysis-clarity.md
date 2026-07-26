# Run Report: UX-004 analysis clarity and public control boundary

## Scope

Issue #78의 점포 목록·지도 Layer·보고서·분석 근거·공개 Scene control 문제를 한국어 상권 화면에
한정해 정리했다. `/en`의 기존 문구와 인쇄 동작은 변경하지 않는다.

## Verified behavior

- `scope=market`과 `scope=radius` 모두 FastAPI 응답 점포 목록을 사용한다.
- API는 선택 업종을 먼저 걸러 반환하므로 unrelated store가 response limit을 먼저 차지하지 않는다.
- `POI`를 제거하고 이름·업종·거리만 표시한다.
- 경쟁 카드는 현재 집계 기준과 동일 업종 점포 수를 함께 표시한다.
- 행정동 배후통계는 detail로 접고, 상권 경계 인구와 혼동하지 않게 했다.
- 한국어 상단 보고서 버튼은 print 대신 dialog를 연다.
- 일반 상권 지도에서 Scene upload/job control을 노출하지 않는다.

## Cache finding

- 분석·점포 API 응답을 저장해 재사용하는 client cache는 현재 없다.
- request 변경 시 `AbortController`가 이전 요청을 중단해 stale 응답을 막는다.
- API의 `lru_cache`는 Settings 생성만 저장한다.
- storefront GLB/atlas cache는 3D asset 재다운로드를 줄이는 용도이며 분석 수치 cache가 아니다.

## Validation

```powershell
uv run --directory product/apps/api pytest tests/test_nearby_search.py
uv run --directory product/apps/api ruff check src/localtwin_api/nearby_search.py tests/test_nearby_search.py
pnpm --dir product/apps/web test --run src/App.test.tsx src/features/market/MarketInspector.test.tsx
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
```

local Korean workspace에서 API가 준비된 뒤 33개 목록과 111개 동일 업종 수가 서로 다른
목록 기준으로 표시되던 원인을 확인했다. API filter 순서를 수정한 뒤에는 선택 업종 목록이
같은 후보 집합에서 반환된다.
