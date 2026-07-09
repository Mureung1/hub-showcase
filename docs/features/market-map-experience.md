# 기능 스펙: 2.5D 상권 지도와 유동인구 Layer

## 1. 문서 상태

```text
구분: 주기능의 지도 표현 계층
우선순위: P0
상태: PoC 검증 전 제안
```

이 기능은 공공데이터 기반 상권 분석 결과를 지도 위에서 탐색하는 핵심 화면이다. 지도는 상권 전체를 비교하는 분석 공간이고, 직접 촬영한 Gaussian Splatting 현장 상세보기와 역할을 분리한다.

## 2. 목표

```text
사용자가 상권의 건물, 점포, 분석 반경과 유동인구 분포를
한 화면에서 비교하고 필요한 Layer를 직접 켜고 끌 수 있게 한다.
```

디자인 방향은 사실적인 위성지도보다 단순한 low-poly 도시 모형에 가깝다. 분석 panel은 업무 도구의 신뢰성과 가독성을 유지한다.

## 3. 화면 역할 분리

### 상권 지도

```text
시점: 상권 전체를 내려다보는 2.5D 시점
목적: 점포, 경쟁, 인구와 매출 분포 비교
범위: 분석 중심 반경 100m / 300m / 500m
```

### 현장 상세보기

```text
시점: 사람이 해당 위치에 서 있는 눈높이
목적: 직접 촬영한 거리의 현장감과 시간대별 체감 혼잡도 확인
범위: 한 가게 앞 또는 거리 10~20m
```

지도 위 유동인구 Layer와 현장 상세보기의 사람 오브젝트는 같은 집계 데이터를 사용할 수 있지만 서로 다른 화면 표현이다.

## 4. 사용자 흐름

```text
1. 사용자가 상권과 업종을 선택한다.
2. 분석 반경 100m / 300m / 500m 중 하나를 선택한다.
3. 지도에서 점포, 건물과 분석 결과를 확인한다.
4. 유동인구 Layer를 켜고 시간대를 선택한다.
5. 지도 위 분포와 우측 분석 panel의 실제 집계값을 함께 확인한다.
6. 특정 가게 또는 촬영 지점을 선택한다.
7. 현장 상세보기를 열어 사람 눈높이의 3DGS 장면을 확인한다.
```

## 5. 지도 Layer

| Layer | 기본 상태 | 표현 | 역할 |
| --- | --- | --- | --- |
| 기본 지도 | 켜짐 | 도로, 보도, 경계 | 공간 맥락 |
| 2.5D 건물 | 켜짐 | low-poly extrusion | 건물 단위 탐색 |
| 점포 | 켜짐 | 업종별 marker | 점포 위치와 선택 |
| 분석 반경 | 켜짐 | 반투명 원과 경계선 | 100m / 300m / 500m 범위 |
| 유동인구 | 꺼짐 | 점, 단순 사람 symbol 또는 heatmap | 시간대별 상대 밀도 |
| 주거인구 | 꺼짐 | choropleth 또는 density | 거주 수요 |
| 매출 | 꺼짐 | 색상 구간 또는 집계 marker | 지역별 매출 수준 |
| 개폐업 변화 | 꺼짐 | 증감 색상 또는 symbol | 상권 변화 |

분석용 thematic Layer는 여러 개를 동시에 겹치면 의미가 흐려질 수 있다. v0.1에서는 `유동인구 / 주거인구 / 매출 / 개폐업 변화` 중 하나를 선택하는 방식을 우선 검토한다.

## 6. 지도 렌더링 후보

### v0.1 후보

```text
React
→ react-map-gl
→ MapLibre GL JS
```

MapLibre를 검토하는 이유:

```text
GeoJSON/vector tile 표시
건물 fill-extrusion
지도 pitch와 bearing
marker, circle, heatmap, cluster
feature-state 기반 선택 강조
custom style
```

`deck.gl`은 v0.1 기본 의존성에 포함하지 않는다. 상권 한 곳과 수백 개 수준의 건물·점포·인구 symbol은 MapLibre Layer로 먼저 구현한다.

다음 조건이 실제 검증에서 확인될 때만 deck.gl을 재검토한다.

```text
수만 개 이상 객체의 동시 렌더링
연속적인 대규모 particle animation
GPU 집계 Layer가 필요한 분석
MapLibre 단독 구현의 측정된 성능 부족
```

## 7. 건물 Footprint와 Extrusion

건물의 바닥 외곽선인 Polygon을 높이만큼 위로 올려 단순한 low-poly 건물을 만든다.

```text
건물 footprint Polygon
+ height
→ fill-extrusion
→ 2.5D 건물
```

Canonical GeoJSON 예시:

```json
{
  "type": "Feature",
  "id": "building-101",
  "properties": {
    "height": 15,
    "height_source": "floor_estimate",
    "floors": 5
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": []
  }
}
```

높이 결정 순서:

```text
1. 공식 또는 원천 데이터의 실제 높이
2. 층수 × 프로젝트에서 정한 층고
3. 정보가 없을 때 사용하는 기본 높이
```

`height_source`에는 `official / floor_estimate / default`를 저장한다. 추정 높이를 실제 측정값처럼 표시하지 않는다.

일반 건물은 평평한 지붕의 단순 extrusion으로 통일한다. 모든 건물에 창문, 간판과 복잡한 지붕을 자동 생성하는 것은 v0.1 범위에서 제외한다.

## 8. 점포와 건물 연결

```text
점포 좌표 Point
→ point-in-polygon
→ 포함되는 건물 footprint 탐색
→ store.building_id 연결
```

건물에 여러 점포가 있으면 건물 선택 후 점포 목록을 표시한다. 점포가 건물 Polygon에 포함되지 않으면 별도 marker로 유지하고 자동으로 가까운 건물에 강제 연결하지 않는다.

반경 검색은 분석 중심점과 점포 좌표 사이의 Haversine 거리를 사용한다.

## 9. 유동인구 Layer

### 입력

```text
지역 또는 상권
기준 날짜와 시간대
population_total 또는 혼잡도 지수
공간 집계 단위
데이터 출처와 산정 방식
```

### 시간 선택

v0.1 대표 시간대:

```text
10시 / 13시 / 15시 / 18시
```

시간대 전환 시 source data 또는 filter를 변경하고, opacity와 크기 transition으로 변화가 부드럽게 보이게 한다.

### 표현 원칙

- 지도 위 점이나 사람 symbol은 집계값을 이해시키는 시각적 표본이다.
- symbol 하나가 실제 사람 한 명을 의미하지 않으면 legend에 그 사실을 명시한다.
- 실제 개인 위치 또는 이동 경로처럼 표현하지 않는다.
- 실제 값, 단위, 집계 기간과 출처는 분석 panel에 별도로 표시한다.
- 이동 방향 데이터가 없으면 도로를 따라 움직이는 사람 흐름을 만들지 않는다.

표기 예시:

```text
예상 유동인구: 약 3,200명/시간
지도 위 표시는 집계값의 상대적 밀도를 시각화한 것입니다.
```

절대 인구 단위가 없는 경우:

```text
혼잡도 지수: 72/100
지도 위 표시는 실제 사람 수 또는 위치를 의미하지 않습니다.
```

## 10. 선택과 상세 Panel

건물 또는 점포를 선택하면 다음 내용을 표시한다.

```text
점포명과 업종
주소와 거리
동일 업종 경쟁 점포 수
입지 점수와 산출 근거
시간대별 유동 특성
매출·개폐업·영업 안정성 지표
데이터 출처
현장 상세보기 action
```

좌석 수처럼 공공데이터에 없는 정보는 직접 관찰 또는 점포 제공값이 있을 때만 표시한다.

## 11. PoC 검증 Gate

MapLibre 채택 전 대상 상권 후보에서 다음을 확인한다.

```text
건물 footprint 확보 가능 여부
건물 높이 또는 층수 데이터의 충분성
점포 좌표와 건물 Polygon 연결 성공률
500m 범위 extrusion 렌더링 성능
유동인구 Layer의 공간 해상도
desktop/mobile의 조작과 가독성
```

건물 데이터가 부족하면 fallback을 사용한다.

```text
일반 2D 지도
+ 확보된 일부 건물만 extrusion
+ 점포 marker와 분석 Layer
```

## 12. 완료 기준

```text
상권 한 곳의 2.5D 건물을 표시할 수 있다.
업종과 분석 반경을 변경할 수 있다.
건물 또는 점포를 선택할 수 있다.
유동인구 Layer를 켜고 끌 수 있다.
10시 / 13시 / 15시 / 18시 데이터를 전환할 수 있다.
실제 집계값과 지도 symbol의 의미를 구분해 표시한다.
선택한 위치에서 현장 상세보기로 이동할 수 있다.
```

## 13. 제외 범위

```text
지도 렌더링 엔진 자체 개발
도시 전체의 정교한 3D model 자동 생성
실시간 개인 위치 추적
근거 없는 이동 경로 animation
모든 건물의 창문·지붕·간판 자동 생성
v0.1의 필수 deck.gl 의존성
Google Earth 수준의 photorealistic 도시 지도
```

## 14. 관련 문서

- [공공데이터 기반 상권 분석](./market-analysis.md)
- [혼잡도 3D 기반 탐색](./3d-congestion-explorer.md)
- [LocalTwin 디자인 시스템](../design/design-system.md)
- [데이터 소스 매핑](../data/data-source-mapping.md)

