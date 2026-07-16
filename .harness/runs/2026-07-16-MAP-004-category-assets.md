# Run Report: MAP-004 category assets and marker LOD

## Scope

- canonical 업종 코드 기반 3D attachment 확대
- 선택 변경 시 custom layer 재사용과 resource cleanup
- HTML marker와 선택 3D marker의 좌표 충돌 제거
- desktop/mobile marker 상한 검증

## Canonical evidence

| code | 업종 | 검증 점포 | store ID |
| --- | --- | --- | --- |
| `G21901` | 꽃집 | 플로리스트오재윤 | `MA010120220805312100` |
| `I21201` | 카페 | 17도씨 | `MA010120220800219123` |
| `I20101` | 백반·한정식 | 더빌리랩스 | `MA0101202406A0538831` |
| `I21001` | 빵·도넛 | 레이어드연남 | `MA0101202406A0599328` |
| `G20405` | 편의점 | GS25연남공원점 | `MA0106202211A1308911` |

근거는 readonly canonical SQLite와 development FastAPI 검색 응답에서 교차 확인했다. 시각 asset은 외부 상표나 실제 facade를 복제하지 않고 Three.js primitive로 직접 제작했다.

## Browser QA

- desktop `1600×900`: 카페 → 베이커리 → 음식점 → 편의점 순서로 재조회·선택했으며 URL, 업종 filter와 inspector가 같은 선택으로 갱신됐다.
- 선택 변경 때 기존 custom layer의 model만 교체했으며 console error는 0건이었다.
- mobile `390×844`: 주변 HTML marker 6개와 선택 custom 3D marker를 확인했다.
- 선택 3D marker 근처의 HTML marker는 거리 기준으로 제외되어 같은 좌표의 중복 표현이 사라졌다.
- MapLibre style teardown 이후 cleanup에서 발생하던 `getLayer` 오류를 방지했다.

## Automated verification

```text
web tests: 42 passed
typecheck: passed
lint: passed
production build: passed
```

## Shared asset verification

```text
GLB body: 26,148B source / 26,448 transfer bytes
SVG atlas: 1,263B source / 1,563 transfer bytes
first cafe selection: GLB 1 request, atlas 1 request
same-session bakery selection: GLB 0 additional requests, atlas 0 additional requests
browser console errors: 0
```

상권 source loading 중 `isStyleLoaded()`가 false이면 이미 지난 초기 `load` event만 기다리던 race를 발견했다. `styledata`와 `idle`에서 준비 상태를 다시 확인하고 설치 후 listener를 제거하도록 수정했으며 회귀 test를 추가했다. 선택 3D와 같은 좌표를 덮던 47px 분석 중심 marker는 투명 ring·외부 label로 바꾸고 선택 시 zoom과 주변 marker 여백을 조정했다.

## Remaining MAP-004 work

- 같은 건물의 복수 점포 대표 marker·점포 수·목록
- reduced-motion과 강제 WebGL 실패 browser regression
- 동일 조건 frame/load 성능 비교와 asset 용량 기록
