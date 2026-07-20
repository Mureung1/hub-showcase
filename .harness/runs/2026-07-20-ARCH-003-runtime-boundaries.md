# Run Report: ARCH-003 runtime boundaries

## Summary

지원 상권·업종·반경을 API의 versioned product catalog 한 곳에서 관리하고 Web·repository·수집 및
평가 도구가 같은 contract를 사용하도록 변경했다. 실제 API 응답이 오기 전 정적 점포와 통계값을
표시하던 runtime fallback도 제거했다.

## Changes

- `product_catalog.py`와 read-only `/api/v1/catalog` 추가
- Web catalog loading·error·retry gate 추가
- App의 정적 상권 통계·점포·landmark fixture 제거
- Web 필터·URL validation·분석 request를 catalog 범위로 전환
- 분석 기간 확인 전 request 차단 및 periods API 기본 분기 사용
- API 분석 endpoint의 추측 기본 period 제거
- repository·importer·snapshot·evaluation 도구의 지원 상권 ID 중복 제거
- 미사용 storefront fixture market ID 제거

## Verification

```text
Task Packet: 62 passed
Docs index/HTML/viewer normalization: passed
Web structure: 4 temporary budgets, passed
Python structure: 84 runtime files, 15 temporary budgets, passed
Checker self-tests: passed
Web: 22 test files, 68 tests passed
API: 114 tests passed
Prettier, TypeScript typecheck, oxlint, Ruff, production build: passed
```

## Known limitation

`ProductWorkspace`, `MarketFilters`, `MarketInspector`와 `SceneWorkspace`의 임시 함수 budget은 후속
WEB-018·WEB-019·SCENE-008에서 제거한다. MapLibre, Three와 Spark의 500kB 이상 chunk warning은
기존 성능 backlog이며 이번 runtime boundary 검증 실패는 아니다.

## Result

ARCH-003 완료. production source에서 지원 상권 ID는 `product_catalog.py`에만 존재하며, 실제 분석
데이터가 없거나 catalog를 불러오지 못하면 fixture로 대체하지 않고 명시적인 loading/error 상태를
표시한다.
