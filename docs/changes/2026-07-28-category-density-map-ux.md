# 업종 Top 7·점포 밀도 지도 UX 변경 기록

## 문서 목적

이 문서는 연남·홍대·합정 지원 상권의 업종 선택과 점포 밀도 지도 개선을 하나의 변경 기록으로 관리한다. 같은 기능에 대해 여러 개의 일회성 Markdown을 만들지 않고, 관련 후속 수정도 이 문서에 이어서 기록한다.

## 적용 범위

- 지원 상권: 연남, 홍대, 합정
- API: `/api/v1/catalog`
- Web: 업종 선택 패널, 점포 밀도 지도, 지도 범례와 하단 지표 배치

## 1. 데이터 기반 업종 Top 7

운영 DB에서 지원 상권에 연결된 점포를 조회한 뒤 `store_id` 기준으로 중복을 제거한다. 각 점포는 소분류 → 중분류 → 대분류 순으로 확인하여 최초 일치하는 사용자용 업종 그룹 하나에만 배정한다.

순위 기준은 다음과 같다.

1. 고유 점포 수 내림차순
2. 포함 상권 수 내림차순
3. 업종 이름 오름차순

API가 운영 DB를 사용할 수 없을 때는 카페·음식점·베이커리·편의점 네 업종을 bootstrap 목록으로 제공한다. 프론트는 bootstrap을 먼저 표시하고 API 응답 성공 시 데이터 기반 목록으로 교체한다.

## 2. 업종 선택 UX

업종 패널은 API가 반환한 업종을 모두 표시한다. 데이터 기반 응답에서는 최대 7개가 노출된다.

각 항목은 다음 정보를 제공한다.

- 순위
- 업종명
- 업종별 아이콘
- 전체 지원 또는 부분 지원 배지
- 현재 선택 상태

부분 지원 업종도 정상적으로 선택 상태를 유지한다. 전체 지원 업종은 매출·유동인구·점수 등 기존 분석 지표와 연결되고, 부분 지원 업종은 점포 위치와 경쟁 지표 중심으로 제공한다.

좁은 화면에서는 업종 목록 영역만 내부 스크롤하여 다음 분석 단계가 화면 아래로 과도하게 밀리지 않도록 한다.

## 3. 점포 밀도 지도

점포 밀도 모드는 선택 업종의 실제 점포 좌표를 GeoJSON Point FeatureCollection으로 변환하고 MapLibre heatmap layer로 표시한다.

공통 색상 단계는 다음과 같다.

| 단계 | 색상 | 의미 |
| --- | --- | --- |
| 낮음 | 파랑 `#3b82f6` | 점포가 상대적으로 적게 모인 구간 |
| 보통 | 주황 `#f59e0b` | 중간 수준으로 모인 구간 |
| 높음 | 빨강 `#ef4444` | 점포가 상대적으로 많이 모인 구간 |
| 최고 밀집 | 진한 빨강 `#b91c1c` | heatmap 최고 강도 |

범례와 heatmap은 같은 색상 상수를 사용한다. 건물의 pastel palette와 점포 업종별 marker 색상은 밀집도 의미가 아니므로 별도로 유지한다.

유동 수요 모드에서는 밀도 범례를 재사용하지 않는다. 사람 아이콘 수가 많을수록 상대 수요가 높다는 별도 안내를 표시한다.

## 4. 지도 오버레이 배치

`map-legend`와 `market-quick-metrics`가 시각적으로 붙지 않도록 공통 overlay gap을 둔다. 모바일에서는 하단 Dock 높이와 줄바꿈을 고려해 더 큰 간격을 사용한다.

## 5. TypeScript GeoJSON 타입 오류

### 증상

```text
StoreDensityHeatmap.tsx(13,24): error TS2503: Cannot find namespace 'GeoJSON'.
StoreDensityHeatmap.tsx(13,50): error TS2503: Cannot find namespace 'GeoJSON'.
```

### 원인

웹 패키지에는 전역 `GeoJSON` namespace를 제공하는 별도 타입 패키지가 없었다. 컴포넌트가 `GeoJSON.FeatureCollection<GeoJSON.Point>`를 직접 참조하면서 TypeScript가 해당 namespace를 찾지 못했다.

### 해결

추가 의존성을 설치하지 않고, 이 컴포넌트가 실제로 사용하는 최소 GeoJSON 구조를 로컬 타입으로 정의했다.

- `FeatureCollection`
- `Feature`
- `Point`
- `[longitude, latitude]` 좌표 tuple
- 문자열 `id` property

이 방식은 전역 namespace에 의존하지 않으며 현재 heatmap 입력 계약을 명시적으로 유지한다.

## 6. 검증

로컬에서 다음 명령을 실행한다.

```powershell
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web test
pnpm --dir product/apps/web build
```

수동 확인 항목:

- API 서버가 7개 업종을 반환하면 패널에도 7개가 표시되는가
- 부분 지원 업종을 선택해도 선택 표시가 유지되는가
- 점포 밀도 범례와 heatmap 색상이 일치하는가
- 유동 수요 모드에서 밀도 범례가 노출되지 않는가
- 데스크톱과 모바일에서 범례와 하단 지표가 겹치지 않는가

## 후속 관리 원칙

이 기능과 직접 연결된 후속 변경은 새 Markdown을 만들지 않고 이 문서에 추가한다. API 계약이나 사용자 흐름이 별도 기능으로 분리될 때만 기존 기능 명세 또는 별도 Issue로 이동한다.
