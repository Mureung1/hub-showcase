# LocalTwin 디자인 시스템

| 항목 | 내용 |
| --- | --- |
| 상태 | Active |
| 버전 | v0.1 |
| 최종 갱신 | 2026-07-16 |
| 적용 대상 | 제품 UI, 기능 프로토타입, 개발문서 사이트 |

## 1. 목적

이 문서는 LocalTwin의 화면을 설계하고 구현할 때 따라야 하는 공통 기준이다.

React 제품과 이전 HTML 프로토타입에 적용되는 색상, 타이포그래피, 레이아웃 규칙을 하나의 기준으로 모은다. 확정 token은 `product/apps/web/src/styles/tokens.css`와 같은 이름으로 유지하고, 공통 component는 실제 반복이 확인될 때만 확장한다.

문서와 구현이 충돌할 때는 다음 순서로 판단한다.

```text
승인된 기능 스펙
→ 이 디자인 시스템
→ 공통 component와 token
→ 개별 화면 구현
```

## 2. 제품 경험 원칙

### 2.1 분석이 먼저다

LocalTwin은 마케팅 사이트가 아니라 반복적으로 사용하는 상권 분석 도구다. 첫 화면부터 지도, 점포, 분석 조건과 결과를 보여준다.

### 2.2 지도는 작업 공간이다

지도는 장식이나 배경 이미지가 아니다. 선택, 필터링, 반경 비교와 점포 탐색이 일어나는 주 작업 영역으로 유지한다.

### 2.3 수치에는 근거를 붙인다

입지 점수, 경쟁 강도와 혼잡도에는 기준, 단위, 관찰 시점 또는 데이터 출처를 함께 제공한다. 색상만으로 좋고 나쁨을 판단하게 만들지 않는다.

### 2.4 조용하고 밀도 있게 구성한다

업무 화면에 필요한 정보 밀도는 유지하되, 장식적인 hero, 과도한 gradient, 중첩된 card와 불필요한 animation은 사용하지 않는다.

### 2.5 3D는 보조 탐색이다

3D 장면은 상권 분석을 대체하지 않는다. 분석 결과에서 현장 맥락을 확인하는 보조 화면으로 연결한다.

### 2.6 Motion은 이해를 돕는다

Motion은 사용자의 시선을 다음 판단 대상으로 옮기거나 공간·시간의 변화를 설명할 때만 사용한다. 장식적인 반복 motion보다 `지도 → 후보 가게 → 3D 현장 → 시간대별 혼잡도`의 관계를 전달하는 전환을 우선한다.

## 3. 디자인 Token

아래 표는 token 의미의 문서 source of truth이고, 실행 값은 `product/apps/web/src/styles/tokens.css`에서 같은 이름으로 관리한다. 두 값이 달라지면 같은 Task에서 함께 갱신한다.

### 3.1 색상

| Token | 값 | 용도 |
| --- | --- | --- |
| `--lt-color-brand` | `#03c75a` | 주요 action, 선택 상태, 브랜드 강조 |
| `--lt-color-brand-strong` | `#08703a` | 링크, hover, 강조 text |
| `--lt-color-text` | `#14211b` | 기본 text |
| `--lt-color-text-muted` | `#65766d` | 보조 설명, metadata |
| `--lt-color-canvas` | `#edf3ef` | 제품 화면 배경 |
| `--lt-color-docs-canvas` | `#f6f8f7` | 개발문서 화면 배경 |
| `--lt-color-surface` | `#ffffff` | panel, dialog, control 표면 |
| `--lt-color-border` | `rgba(15, 23, 42, 0.13)` | 구분선과 control border |
| `--lt-color-info` | `#2563eb` | 정보, 비교 series |
| `--lt-color-warning` | `#f59e0b` | 주의, 변동성 |
| `--lt-color-danger` | `#dc2626` | 오류, 위험 |

사용 규칙:

- 브랜드 녹색은 주요 action과 현재 선택을 표시할 때 사용한다.
- `info`, `warning`, `danger` 색상은 의미를 바꾸어 사용하지 않는다.
- 상태는 색상과 함께 label, icon 또는 수치를 표시한다.
- 새로운 색상을 추가하기 전에 기존 token으로 표현할 수 있는지 확인한다.
- text와 배경은 WCAG AA 수준의 대비를 목표로 한다.

### 3.2 타이포그래피

기본 font stack:

```css
Inter, Pretendard, "Apple SD Gothic Neo", system-ui, -apple-system,
BlinkMacSystemFont, "Segoe UI", sans-serif
```

| 역할 | 크기 | 굵기 |
| --- | --- | --- |
| 화면 제목 | `28px` | `700` |
| section 제목 | `20px` | `700` |
| panel 제목 | `16px` | `700` |
| 본문 | `16px` | `400` |
| control / 보조 text | `14px` | `600` |
| metadata | `12px` | `600` |

사용 규칙:

- viewport 너비에 따라 font 크기를 비례 확대하지 않는다.
- 숫자와 단위 사이의 위계를 명확히 하되, 점수만 과도하게 크게 만들지 않는다.
- letter spacing은 기본값 `0`을 사용한다.
- compact panel 안에는 hero 크기의 제목을 사용하지 않는다.

### 3.3 간격과 크기

기본 spacing scale:

```text
4px / 8px / 12px / 16px / 24px / 32px
```

| 대상 | 기준 |
| --- | --- |
| icon button | 최소 `40px × 40px` |
| 일반 control | 최소 높이 `40px` |
| 상단 app bar | `56px` 또는 `64px` |
| panel 내부 여백 | `16px` 또는 `24px` |
| card 간격 | `12px` 또는 `16px` |
| card radius | 최대 `8px` |
| control radius | `6px` 또는 `8px` |

원형 지도 marker, avatar와 명확한 상태 pill만 완전한 원형을 허용한다. text가 들어간 일반 button을 pill 형태로 만들지 않는다.

### 3.4 Border와 Shadow

- 기본 경계는 `1px solid var(--lt-color-border)`를 사용한다.
- shadow는 지도 위 inspector, dropdown, dialog처럼 실제로 떠 있는 요소에만 사용한다.
- page section 전체를 떠 있는 card처럼 표현하지 않는다.
- card 안에 다시 card를 중첩하지 않는다.

## 4. 화면 구조

### 4.1 상권 분석 화면

```text
상단 app bar
├─ 서비스명 / 현재 상권
├─ 검색
└─ 전역 action

본문
├─ 좌측: 상권 선택, 업종과 반경 filter, 점포 목록
├─ 중앙: 지도와 marker
└─ 우측: 선택 대상의 지표, score, report
```

- 지도는 데스크톱 본문의 가장 넓은 영역을 차지한다.
- 좌우 panel은 지도와 비교할 때 보조 영역임이 드러나야 한다.
- filter 변경으로 지도 크기나 toolbar 위치가 움직이지 않게 안정적인 column 크기를 사용한다.
- loading, empty, error, selected 상태를 각각 설계한다.

지도 시각 방향:

- 사실적인 위성사진보다 단순한 low-poly 도시 모형을 우선 검토한다.
- 건물은 footprint와 높이를 이용한 단순 extrusion으로 표현한다.
- 일반 건물은 중립색으로 두고 선택한 건물과 업종 marker만 강조한다.
- 유동인구 Layer는 사용자가 켜고 끌 수 있어야 한다.
- 지도 위 사람 symbol은 실제 개인 위치가 아니라 집계값의 시각적 표본임을 표시한다.
- 지도 화면과 사람 눈높이의 Gaussian Splatting 현장 상세보기를 혼동하지 않는다.

핵심 점포 3D store marker 방향:

- 배경 건물은 기존 footprint extrusion을 유지하고 검색·선택된 핵심 점포만 상세 3D로 표현한다.
- `pastel low-poly miniature + pixel-style category decal`을 기본 시각 언어로 사용한다.
- 실제 facade를 재현하거나 앞면을 추정하지 않고, 어느 지도 회전에서도 읽히는 옥상 장식·둘레 category band·halo를 사용한다.
- 건물 geometry는 부드러운 low-poly, 업종 표식은 직접 제작한 16×16 또는 32×32 pixel 문법으로 구분한다.
- 업종마다 모델을 복제하지 않고 기본 prefab, material, UV decal과 대표 attachment를 조합한다.
- 업종 전용 표식은 canonical 업종 또는 명시적 원천 tag로 검증된 경우에만 적용하며 점포명으로 추정하지 않는다.
- 분류가 없거나 충돌하면 `generic` marker를 사용하고, 한 건물에 여러 점포가 있으면 대표 marker와 점포 수·목록을 제공한다.
- 외부 레퍼런스는 형태 조사에만 사용하고 실제 asset은 저작권·상표를 복제하지 않게 새로 제작한다.
- 미분류 업종과 3D load 실패는 기존 marker로 fallback한다.
- 상세 규격과 구현 Gate는 [상권 지도와 핵심 3D Store Marker](../features/market-map-experience.md#81-현재-prefab과-map-004-목표)를 따른다.

첫 category attachment 규칙:

| canonical code | 화면 업종 | 방향 독립형 대표 장식 |
| --- | --- | --- |
| `G21901` | 꽃집 | 옥상 꽃잎 군집 |
| `I21201` | 카페 | 옥상 커피잔과 손잡이 |
| `I2*` | 음식점 | 옥상 그릇과 교차 젓가락 |
| `I21001` | 베이커리 | 옥상 빵 3개 |
| `G20405` | 편의점 | 사방에서 읽히는 색상 band 간판 |

이 장식은 실제 점포의 상표·간판·외관을 복제하지 않은 자체 제작 procedural geometry다. 정확한 code가 있는 카페와 베이커리를 음식점 family보다 먼저 판정하며, 지원하지 않는 code는 공통 `generic` prefab 또는 HTML marker로 표시한다.

공통 점포 body는 사방에 창문·차양이 있는 자체 생성 GLB를 사용하고, category atlas는 사방 decal에 같은 cell을 적용한다. 선택 점포와 분석 중심이 같으면 300m 중심 표식은 불투명한 원 대신 투명 ring과 바깥 label로 표시해 3D marker를 가리지 않는다. 3D marker는 실제 건물 축척이 아니라 선택 대상을 읽기 위한 landmark이므로 선택 시에만 확대하되 주변 후보 marker와 겹치지 않게 여백을 둔다.

### 4.2 혼잡도 3D 탐색 화면

```text
3D scene
├─ 사람 눈높이의 Gaussian Splatting 현장
├─ 통계 기반의 추상적 사람 오브젝트
├─ 현장 marker와 정보 panel
└─ 10시 / 13시 / 15시 / 18시 시간대 control
```

- 3D scene은 장식 card 안에 넣지 않고 주 작업 영역으로 제공한다.
- 시간대 control은 segmented control을 사용한다.
- 혼잡도에는 관찰값, 관찰 시점과 데이터 성격을 명시한다.
- 촬영된 실제 사람과 통계 기반 사람 오브젝트의 시각적 표현을 구분한다.
- 사람 오브젝트는 low-poly, 단색 silhouette 등 의도적으로 단순한 형태를 사용한다.
- 장면의 사람 수가 실제 집계 인원과 일치하지 않으면 그 의미를 legend로 설명한다.
- camera 이동과 marker 선택은 keyboard로도 접근 가능한 대체 control을 제공한다.

### 4.3 반응형 동작

- 데스크톱에서는 지도와 분석 panel을 동시에 비교할 수 있게 한다.
- 모바일에서는 지도, 목록, 상세를 한 화면에 모두 압축하지 않는다.
- 모바일 상세 정보는 sheet 또는 별도 view로 열고 명확한 닫기 action을 제공한다.
- `320px` 너비에서도 text와 control이 겹치거나 화면 밖으로 밀리지 않아야 한다.

### 4.4 MotionSites 레퍼런스 적용 가이드

[MotionSites](https://motionsites.ai/)는 제품 화면을 복제하기 위한 template가 아니라, 핵심 대상을 강조하고 장면을 전환하는 motion reference로 사용한다. LocalTwin에는 다음 사례의 구성 원리를 선별 적용한다.

| 레퍼런스 | 참고할 원리 | LocalTwin 적용 위치 | 우선순위 |
| --- | --- | --- | --- |
| `Terra Geo Map` | 큰 공간에서 선택 지점으로 시선을 좁히는 지도 중심 진입 | 도시 또는 상권 윤곽 → 분석 반경 → 후보 가게 순차 진입 | 높음 |
| `Framelix 3D Studios` | full-bleed 장면과 최소한의 overlay로 3D 대상에 집중 | Gaussian Splatting 현장 상세보기 | 높음 |
| `Transform Data` | 하나의 입력과 하나의 결과를 중심으로 한 명확한 시작점 | 첫 실행 안내, 주소·업종 입력 또는 발표용 demo intro | 중간 |
| `Liquid Glass Agency` | 배경 맥락을 유지하는 제한적 반투명 surface | 지도 toolbar, 선택 점포 card, 3D 시간대 panel | 낮음 |
| MotionSites preview gallery | 짧은 preview와 상태 피드백으로 여러 후보를 빠르게 비교 | 상권 비교, demo 장면 선택, portfolio preview | 낮음 |

권장 전환 흐름:

```text
도시 또는 상권 윤곽
→ 선택 상권으로 camera 이동
→ 분석 반경과 후보 marker 표시
→ 후보 가게 선택
→ 3D 현장 상세보기 전환
→ 10시 / 13시 / 15시 / 18시 혼잡도 crossfade
→ 지도 분석으로 돌아가기
```

적용 규칙:

- 상권 분석 업무 화면의 3-column 구조와 정보 밀도는 유지한다.
- 지도 진입 motion은 demo 또는 첫 진입에서만 짧게 사용하고 반복 탐색을 지연시키지 않는다.
- 3D 전환은 장면 자체를 주 작업 영역으로 제공하고, overlay 수를 최소화한다.
- 시간대 변경은 camera를 매번 초기화하지 않고 사람 silhouette, 혼잡도와 관찰값만 전환한다.
- glass treatment는 지도와 3D 위의 떠 있는 control에만 허용한다.
- 모든 자동 motion은 `prefers-reduced-motion`에서 즉시 전환 또는 짧은 fade로 대체한다.

적용하지 않는 패턴:

- 제품 화면 전체를 검정 배경, neon glow 또는 glass surface로 변경
- 반복 재생되는 WebGL 배경과 cursor-follow 효과
- 분석 정보보다 큰 marketing headline
- 모든 chart, marker와 panel에 동시에 animation 적용
- scroll 길이에 의존하는 cinematic storytelling
- 3D 효과가 상권 분석보다 먼저 보이거나 더 중요한 기능처럼 보이는 구성

## 5. Component 규칙

### 5.1 Button과 Action

- 익숙한 기능에는 Lucide icon 또는 프로젝트가 채택한 동일 icon set을 사용한다.
- 저장, 닫기, 확대, 축소, 위치 이동 등 익숙한 action은 icon button을 우선한다.
- unfamiliar icon에는 tooltip과 accessible name을 제공한다.
- 한 화면의 primary button은 가능한 한 하나로 유지한다.
- destructive action은 `danger` 색상과 확인 과정을 사용한다.

### 5.2 Filter와 선택

- 업종과 지도 조건처럼 선택지가 적은 mode는 segmented control을 사용한다.
- 선택지가 많은 목록은 select 또는 menu를 사용한다.
- binary 설정은 checkbox 또는 switch를 사용한다.
- 반경처럼 명확한 숫자 옵션은 `100m / 300m / 500m` segmented control을 사용한다.

### 5.3 Card와 Panel

- card는 개별 점포, 반복 항목, dialog 또는 실제로 구획이 필요한 도구에만 사용한다.
- page section마다 card를 만들지 않는다.
- score card에는 총점뿐 아니라 하위 지표와 산출 근거로 가는 경로를 둔다.
- 정보가 없을 때 빈 사각형 대신 설명과 다음 action이 있는 empty state를 표시한다.

### 5.4 지도 Marker

- marker의 모양과 색상은 업종, 선택 상태, 혼잡도를 동시에 표현하려 하지 않는다.
- 기본 marker와 선택 marker의 크기, border 또는 label 차이를 분명히 한다.
- marker가 밀집되면 cluster 또는 zoom 기준 표시를 사용한다.
- marker 선택 결과는 지도 밖의 상세 panel에도 동일하게 반영한다.

### 5.5 Chart와 Score

- axis, 단위, 기간과 데이터 출처를 표시한다.
- 색상만으로 series를 구분하지 않고 legend, label 또는 line style을 함께 사용한다.
- 점수는 `72/100`처럼 분모를 표시한다.
- 데이터가 fixture, 수동 관찰 또는 공공데이터인지 구분한다.
- 분석 결과를 성공 예측이나 확정적 추천처럼 표현하지 않는다.

## 6. 상태와 접근성

모든 주요 화면과 component는 다음 상태를 고려한다.

```text
default
hover
focus-visible
selected
disabled
loading
empty
error
```

검증 기준:

- keyboard만으로 주요 탐색과 action을 수행할 수 있다.
- focus indicator를 제거하지 않는다.
- interactive element에는 accessible name이 있다.
- 오류 메시지는 색상 외 text로 원인과 복구 action을 설명한다.
- animation은 `prefers-reduced-motion`을 존중한다.
- 긴 상권명, 점포명과 가장 긴 option에서도 layout이 깨지지 않는다.

## 7. Content 규칙

- 짧고 직접적인 한국어를 사용한다.
- button은 행동을 나타내는 동사로 작성한다.
- 내부 기술 용어보다 사용자가 판단하는 데 필요한 의미를 먼저 보여준다.
- `AI 추천`, `성공 가능성`처럼 근거보다 강한 표현을 사용하지 않는다.
- 수동 관찰값과 fixture는 실제 공공데이터처럼 보이게 만들지 않는다.

예시:

```text
좋음: 반경 300m의 카페 18곳
피함: 경쟁이 매우 치열한 최고의 상권
```

## 8. UI 작업 절차

### 작업 전

- 관련 기능 스펙과 이 문서를 읽는다.
- 재사용할 수 있는 기존 pattern과 component를 확인한다.
- 화면의 입력, 출력, 상태와 완료 기준을 정한다.

### 구현 중

- 임의의 색상과 간격 대신 token을 사용한다.
- 새로운 component보다 기존 component 확장을 우선한다.
- desktop과 mobile layout을 함께 구현한다.
- loading, empty와 error 상태를 빠뜨리지 않는다.

### 완료 전

- 주요 desktop과 mobile viewport에서 screenshot을 확인한다.
- keyboard focus 순서를 확인한다.
- text overflow, 겹침과 화면 이동을 확인한다.
- 색상 대비와 상태 전달 방식을 확인한다.
- 기능 스펙 및 개발 체크리스트와 구현이 일치하는지 확인한다.

## 9. 변경 관리

디자인 기준 변경은 다음 순서로 진행한다.

```text
변경 이유 기록
→ design-system.md 갱신
→ token / 공통 component 갱신
→ 영향을 받는 화면 검증
→ screenshot 또는 smoke check 기록
```

개별 화면에서만 필요한 예외는 코드에 조용히 추가하지 않는다. 예외의 이유와 적용 범위를 기능 스펙 또는 `docs/module-notes/`에 남긴다.

## 10. 현재 적용 상태

### 확정

- 지도 중심의 상권 분석 화면
- 녹색 브랜드 색상과 의미 기반 보조 색상
- `Inter + Pretendard` 중심 font stack
- 업무 도구에 맞춘 정보 밀도
- 3D를 보조 탐색 화면으로 제한
- 접근 가능한 상태와 반응형 검증 원칙

### 구현 필요

- [x] `product/apps/web/src/styles/tokens.css` 생성
- [ ] 공통 button, filter, panel, score, marker component 구현
- [ ] 임의 색상과 spacing 사용을 확인하는 lint 또는 check 추가
- [ ] desktop/mobile visual regression 기준 화면 추가
- [ ] 기존 HTML 프로토타입을 이 문서의 radius와 token 기준으로 정리

## 11. 관련 문서

- [프로젝트 기획서](../wiki/localtwin-project-proposal.md)
- [공공데이터 기반 상권 분석 스펙](../features/market-analysis.md)
- [상권 지도, 2.5D 건물과 핵심 3D Store Marker 스펙](../features/market-map-experience.md)
- [Gaussian Splatting 현장 상세보기 스펙](../features/3d-congestion-explorer.md)
- [전체 개발 체크리스트](../development/checklist.md)
- [검증 가이드](../development/validation.md)
- [상권 분석 프로토타입](../prototypes/core-market-analysis-prototype.html)
