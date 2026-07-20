# Run Report: MAP-005

## Summary

```text
Task: 전체 기본 지도와 지원 지역 LocalTwin 3D Overlay 분리
Status: passed
Date: 2026-07-16
GitHub: #36
Jira: LT-8 (Parent: LT-7)
```

OpenFreeMap Liberty basemap을 모든 mode에서 유지하고, 연남·홍대·합정의 LocalTwin GeoJSON을 지역별 고유 Source/Layer Overlay로 분리했다. 관평동은 지도 근거가 없으므로 `planned + scene` capability만 유지했다.

## Implementation Evidence

| 항목 | 결과 |
| --- | --- |
| basemap | `BASE_MAP_STYLE_URL` 하나를 두 mode에서 공통 사용 |
| Overlay registry | 연남·홍대·합정 `ready`, 관평동 `planned` |
| Source | `yeonnam/hongdae/hapjeong-localtwin-map` 고유 ID |
| clipping | EPSG:5179의 720m buffer로 기존 geometry를 clip한 뒤 WGS84 저장 |
| 연남 | 5,331 → 4,351 feature |
| 홍대 | 7,033 → 5,848 feature |
| 합정 | 6,026 → 5,157 feature |
| 기존 MAP-004 | `features/map/storefronts/` 미커밋 prototype을 수정하지 않음 |

## Automated Verification

```text
Web test: 7 files, 19 tests passed
TypeScript typecheck: passed
Oxlint: passed
Production build: passed
Map builder Ruff: passed
Map data check: 3 files passed
Task Packet check: 40 packets passed
Docs HTML and local links: passed
Docs index: passed
Git diff check: passed
```

주요 명령:

```powershell
uv run --project product/apps/api ruff check product/scripts/build_localtwin_map.py
uv run --project product/apps/api python product/scripts/build_localtwin_map.py --check
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
```

## Browser Smoke

Playwright CLI로 `http://127.0.0.1:5173/`을 1440×900 viewport에서 확인했다.

```text
OpenFreeMap style: HTTP 200
yeonnam.geojson: HTTP 200
hongdae.geojson: HTTP 200
hapjeong.geojson: HTTP 200
LocalTwin → 실제 지도: basemap과 camera 유지, Overlay만 제거
실제 지도 → LocalTwin: 세 Overlay 복원
지원 영역 밖 pan: 기본 도로와 회색 3D 건물 계속 표시
지원 영역 밖 status: 기본 지도 탐색 가능·새 분석은 지원 지역에서 시작 안내
duplicate Source/Layer 및 WebGL error: 없음
```

검증 screenshot은 local `output/playwright/`에만 두고 Git artifact에는 포함하지 않았다.

관찰된 비차단 console 항목:

- 개발 서버 `favicon.ico` 404
- OpenFreeMap sprite의 `gate`/`swimming_pool` 누락 warning
- MapLibre worker의 일부 nullable numeric value warning

세 항목 모두 map/source 요청 실패나 화면 공백을 만들지 않았다. numeric warning의 원천은 별도 회귀 항목으로 남기며 MAP-005 완료 증거로 숨기지 않는다.

## Remaining Boundary

- 관평동 지도 Overlay는 실제 좌표·경계·snapshot 승인 뒤 별도 data task에서 추가한다.
- 분석 원 이동과 실제 반경 점포 query는 `ANALYSIS-002 / #26`에서 구현한다.
- 전체 Front-API 오류·retry·stale smoke는 `EVAL-002 / #27`에서 수행한다.
