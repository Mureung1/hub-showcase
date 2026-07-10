# Run Report: MAP-003 LocalTwin map data

## Summary

```text
Task: MAP-003
Status: passed
Date: 2026-07-11
```

## Scope

```text
연남·홍대·합정의 실제 OSM 도로·건물·녹지·물·POI를 상권별 GeoJSON으로 생성했다.
LocalTwin mode는 외부 basemap tile 없이 해당 snapshot과 전용 style만 렌더링한다.
실제 지도 mode는 좌표 비교용 fallback으로 유지했다.
건물은 실제 footprint와 OSM/추정 높이를 사용해 low-poly 2.5D로 표시한다.
```

## Data Result

| Market | Radius | Features | Size |
| --- | ---: | ---: | ---: |
| Yeonnam | 720m | 5,331 | 1.84MB |
| Hongdae | 720m | 7,033 | 2.30MB |
| Hapjeong | 720m | 6,026 | 1.91MB |

## Verification

```powershell
python -m py_compile scripts/build_localtwin_map.py
python scripts/build_localtwin_map.py --check
pnpm --dir apps/web test
pnpm --dir apps/web lint
pnpm --dir apps/web build
python scripts/check_docs_html.py
python scripts/check_task_packet.py --root .
```

Result:

```text
Map data check passed: 3 market files.
Front tests: 4 passed.
Oxlint and TypeScript/Vite build passed.
Docs HTML and local links passed.
```

Browser result:

```text
1440×980: 연남과 합정의 건물·도로·label 렌더링 확인
390×844: 지도 canvas, mode button과 map controls 표시 확인
fresh LocalTwin session: local GeoJSON과 font glyph만 요청, external basemap style/tile request 없음
실제 지도 mode 왕복과 hapjeong.geojson 200 응답 확인
```

## Notes

```text
MapLibre는 지도 엔진으로 사용하지만 지도 내용과 style은 LocalTwin snapshot이 구성한다.
OSM attribution은 화면과 GeoJSON metadata에 모두 남겼다.
OSM height/levels가 없을 때의 기본 높이는 시각화용이며 분석값으로 쓰지 않는다.
```

## Follow-up

```text
건물 지붕·창문·가로수 prefab은 DESIGN-001에서 실제 footprint 위에 단계적으로 추가한다.
대상 지역이나 feature 수가 커져 측정 성능이 부족해질 때만 PMTiles 전환을 검토한다.
```
