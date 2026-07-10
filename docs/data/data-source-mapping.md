# LocalTwin v0.1 데이터 소스 매핑

이 문서는 LocalTwin v0.1에 필요한 공공데이터가 충분한지 판단하고, 원천 데이터와 내부 canonical schema를 연결하기 위한 기준 문서다.

## 1. 결론

v0.1 MVP 기준으로는 필요한 최소 데이터가 충분하다.

다만 이 결론은 다음 범위에서만 성립한다.

```text
LocalTwin v0.1:
공공데이터와 제한된 관찰값을 바탕으로
후보 상권의 경쟁 강도, 개폐업 흐름, 시간대별 특성을
한 화면에서 이해하도록 돕는 상권 분석 데모 서비스
```

상용 수준의 창업 컨설팅, 매출 예측, 생존율 예측 서비스까지 하려면 추가 데이터가 필요하다.

```text
매출/카드 소비 데이터
임대료/공실 데이터
실제 보행 유동인구
교통 접근성
상권별 업종 생존율
경쟁점 리뷰/평점
계절/날씨/이벤트 데이터
```

2026-07-09 논의에서 다음 데이터를 추가 조사 대상으로 정리했다. 이 목록은 확보 완료를 의미하지 않는다.

```text
남성/여성 인구
주거인구
유동인구
카드매출
지역별 매출 순위
평균 영업기간
신생기업 생존율
개폐업 현황
업종 분포
요일별 분석
시간대별 분석
종합분석
```

실제 원천 필드, 공간·시간 단위, 이용 조건과 갱신 주기를 확인한 뒤 v0.1 포함 여부를 결정한다.

## 2. 기능별 데이터 충분성

| 기능 | 필요한 데이터 | v0.1 가능 여부 |
| --- | --- | --- |
| 지도에서 홍대/신촌/관평동 보기 | 상권정보, 지도 좌표 | 가능 |
| 점포 마커 표시 | 소상공인 상가/상권정보 | 가능 |
| 카페/음식점 필터 | 상가업종정보, 일반/휴게음식점 | 가능 |
| 반경 100m/300m/500m 경쟁 분석 | 점포 좌표, 업종 | 가능 |
| 개업/폐업 흐름 | 일반음식점/휴게음식점 인허가 | 가능 |
| 서울 홍대/신촌 시간대 유동 | 서울 생활인구 | 가능 |
| 관평동 시간대 유동 | 수동 관찰값 | 부분 가능 |
| 입지 점수 | 상권정보, 인허가, 유동/관찰값 | 가능 |
| 템플릿 리포트 | 분석 결과 조합 | 가능 |
| 관평동 3D 데모 | 직접 촬영, 수동 관찰, 3D asset | 공공데이터만으로는 불가 |

### 2.1 원본 데이터, 계산 지표와 UI 구분

| 구분 | 항목 |
| --- | --- |
| 원본 데이터 후보 | 성별 인구, 주거인구, 유동인구, 카드매출, 업종, 개업일, 폐업일, 영업 상태 |
| 계산 지표 | 지역별 매출 순위, 평균 영업기간, 신생기업 생존율, 업종 분포, 개폐업 순증감 |
| 분석 View | 요일별 인구/매출, 시간대별 인구/매출, 종합분석 |
| UI Filter | 지역, 업종, 반경, 기간, 요일, 시간대, 성별 |

`업종별 filter`는 원본 데이터가 아니라 정규화된 업종 field를 사용하는 UI 기능이다.

## 3. 필수 데이터

### 3.1 소상공인시장진흥공단 상권정보

역할:

```text
Store 데이터 원천
```

사용 목적:

```text
점포 마커
업종 필터
카페/음식점 분류
반경 내 동일 업종 수
경쟁 강도
```

공식 설명 기준으로 상가업소정보와 상가업종정보를 파일데이터와 OpenAPI로 제공하며, 상호명, 지점명, 주소, 도로명, 상권번호, 표준산업분류코드, 업종 대/중/소분류를 포함한다.

### 3.2 일반음식점 인허가 데이터

역할:

```text
PermitBusiness 데이터 원천
```

사용 목적:

```text
음식점 개업 흐름
음식점 폐업 흐름
최근 순증감
상권 변동성
위험 요인
```

공식 OpenAPI는 REST, JSON/XML 형식이며, 일반음식점 인허가일자, 영업상태, 사업장명, 소재지주소 등을 제공한다.

### 3.3 휴게음식점 인허가 데이터

역할:

```text
카페/간단식/음료 계열 PermitBusiness 데이터 원천
```

사용 목적:

```text
카페 개업 흐름
카페 폐업 흐름
카페 경쟁 변화
```

공식 OpenAPI는 REST, JSON/XML 형식이며, 휴게음식점 인허가일자, 영업상태, 사업장명, 소재지주소 등을 제공한다. 키워드에 카페, 다류, 아이스크림류가 포함되어 있어 카페 계열 분석에 중요하다.

### 3.4 서울 생활인구

역할:

```text
홍대/신촌 시간대별 수요 데이터 원천
```

사용 목적:

```text
10시 / 13시 / 15시 / 18시 시간대별 유동 그래프
오전형/점심형/오후체류형/저녁형 판단
수요 점수
```

서울 생활인구는 서울시 공공데이터와 통신데이터를 활용해 특정 시점에 서울의 특정 지역에 존재하는 인구를 추정한 데이터다. OpenAPI/Sheet는 최근 2개월 데이터만 제공하므로, 과거 비교가 필요하면 파일 다운로드 방식도 함께 검토한다.

### 3.5 지도/경계/건물 데이터

역할:

```text
Market 경계와 지도 보강 데이터
```

사용 목적:

```text
관평동 경계 확인
지도 영역 제한
행정동 코드 매핑
공간 데이터 보강
좌표계 확인
건물 footprint
건물 높이 또는 층수
```

v0.1의 2.5D 상권 지도는 MapLibre GL JS를 후보로 검토한다. 대상 상권의 건물 footprint와 높이 데이터로 PoC를 수행한 뒤 채택 여부를 결정한다. 데이터가 부족하면 2D 지도와 일부 건물 extrusion을 결합한 fallback을 사용한다.

### 3.6 인구와 성별 데이터 후보

확인할 field:

```text
남성 인구
여성 인구
주거인구
유동인구 또는 생활인구
요일
시간대
연령대
공간 집계 단위
```

`남성 54%`처럼 표시할 때 주거인구인지 유동인구인지 반드시 구분한다. 생활인구와 실제 보행 유동인구도 같은 개념으로 취급하지 않는다.

### 3.7 카드매출 데이터 후보

후보 출처:

```text
서울시 데이터
공공데이터포털
카드사 또는 상권 분석 데이터 제공기관
```

확인할 조건:

```text
실제 매출 또는 추정 매출 여부
금액 단위와 부가세 포함 여부
점포/업종/상권 집계 단위
요일과 시간대 제공 여부
비식별 및 최소 표본 기준
API/파일 제공 방식
라이선스와 재배포 조건
```

확보와 이용 조건을 검증하기 전까지 카드매출 기능은 조건부다.

### 3.8 영업기간과 신생기업 생존율

필요 raw field:

```text
business_id 또는 동일 점포를 연결할 수 있는 key
open_date
close_date
status
category
area_id
reference_date
```

계산 규칙:

```text
현재 영업기간 = 기준일 - 개업일
폐업 점포 영업기간 = 폐업일 - 개업일
N개월 생존율 = N개월 뒤 영업 중인 cohort 점포 수 / cohort 전체 점포 수
```

현재 영업 중인 점포와 폐업 점포의 기간을 하나의 평균으로 섞지 않는다. 생존율에는 cohort 기간, 판정 기간, 표본 수와 상태 판정 기준을 함께 저장한다.

## 4. 관평동 데이터 전략

관평동은 상가/인허가 분석은 공공데이터로 가능하지만, 시간대별 유동인구는 공식 데이터가 바로 확인되지 않을 수 있다.

따라서 v0.1에서는 관평동을 다음처럼 처리한다.

```text
상가/인허가 분석:
공공데이터 기반

시간대별 혼잡도:
수동 관찰값 기반

3D 데모:
직접 촬영 기반
```

이 사실은 UI와 리포트에서 숨기지 않는다.

표기 예시:

```text
관평동 시간대 혼잡도는 공공 유동인구가 아니라 직접 관찰값 기반입니다.
```

## 5. 우선순위

### 1순위

반드시 확보한다.

```text
소상공인시장진흥공단 상권정보
일반음식점 인허가
휴게음식점 인허가
서울 생활인구
```

### 2순위

가능하면 확보한다.

```text
행정동/법정동 코드
브이월드 경계 또는 행정동 경계
관평동 수동 관찰값 CSV
```

### 3순위

후속 버전에서 검토한다.

```text
지하철/버스 승하차
주차장
사업체/주민등록 인구
매출/소비 추정 데이터
```

## 6. Canonical Schema 매핑

| 도메인 | 대표 raw 필드 | canonical field | 비고 |
| --- | --- | --- | --- |
| Store | 상호명 | `name` | 상권정보 원천 |
| Store | 지점명 | `branch_name` | 없으면 `null` |
| Store | 도로명주소 | `road_address` | 노출/검색용 |
| Store | 지번주소/주소 | `address` | 보조 주소 |
| Store | 표준산업분류코드 | `ksic_code` | 업종 정규화 |
| Store | 상가업종 대/중/소분류 | `category_major` / `category_middle` / `category_minor` | UI 필터 |
| Store | 상권번호 | `market_code_raw` | 원천 보존 |
| Store | 위도/경도 | `lat` / `lng` | 지도 마커/반경 계산 |
| PermitBusiness | 사업장명 | `name` | 인허가 업소명 |
| PermitBusiness | 인허가일자 | `license_date` | 개업 흐름 계산 |
| PermitBusiness | 영업상태/영업상태명 | `status` | 영업/폐업/정상 등 |
| PermitBusiness | 폐업일자 | `close_date` | 있으면 폐업 흐름 계산 |
| PermitBusiness | 소재지주소 | `address` | 지역 필터 |
| PermitBusiness | X좌표/Y좌표 | `raw_x` / `raw_y` | 좌표계 원본 보존 |
| PermitBusiness | 변환 좌표 | `lat` / `lng` | 서비스용 좌표 |
| FlowObservation | 기준일 | `date` | 시계열 키 |
| FlowObservation | 시간/시간대구분 | `hour` | 10/13/15/18시 추출 |
| FlowObservation | 행정동코드 | `admin_dong_code` | 서울 생활인구 매핑 |
| FlowObservation | 생활인구 총량 | `population_total` | 수요 점수 |
| FlowObservation | 남성/여성 인구 | `population_male` / `population_female` | 데이터가 제공될 때만 사용 |
| FlowObservation | 주거/유동 구분 | `population_type` | `resident` / `floating` / `living` |
| SalesObservation | 기준일/기간 | `date` / `period` | 매출 집계 기준 |
| SalesObservation | 카드매출 | `sales_amount` | 실제/추정 여부 별도 저장 |
| SalesObservation | 요일/시간대 | `day_of_week` / `hour` | 제공될 때만 사용 |
| SalesObservation | 공간/업종 | `area_id` / `category` | 순위 비교 집합 |
| BusinessLifecycle | 점포 식별자 | `business_id` | cohort 추적용 |
| BusinessLifecycle | 개업일/폐업일 | `open_date` / `close_date` | 영업기간 계산 |
| BusinessLifecycle | 영업 상태 | `status` | 생존 판정 |
| Building | 건물 geometry | `geometry` | footprint Polygon |
| Building | 높이/층수 | `height` / `floors` | 2.5D extrusion |
| Building | 높이 출처 | `height_source` | 공식/층수 추정/default |
| Boundary | 행정동 코드 | `admin_dong_code` | 코드 매핑 |
| Boundary | geometry | `geometry` | 지도 경계 |

## 7. 지역 적용 방식

홍대와 신촌은 상권명에 가깝기 때문에 행정동명만으로 자르기보다 중심좌표와 반경을 함께 사용한다.

```text
홍대:
홍대입구역 또는 서교동 중심점 + 300m/500m 반경

신촌:
신촌역 중심점 + 300m/500m 반경
```

관평동은 행정동명이므로 동명/주소 필터를 기본으로 한다.

```text
관평동:
동명/주소 필터 + 3D 데모 지점 중심 반경
```

## 8. 수집 구조

공공데이터를 프론트엔드가 직접 호출하지 않는다.

권장 구조:

```text
공공데이터 원천
-> API/File importer
-> raw snapshot 저장
-> canonical 변환
-> SQLite 저장
-> FastAPI 서비스 API
-> React Dashboard
```

원본 저장 규칙:

```text
data/raw/{source_family}/
```

정규화 저장 규칙:

```text
data/processed/{model}/
```

스냅샷 메타데이터:

```text
source_name
source_type
source_url
source_updated_at
data_reference_date
collected_at
license
spatial_granularity
temporal_granularity
estimation_method
```

지표 결과 metadata:

```text
metric
value
unit
area_id
period
day_of_week
time_slot
category
source_name
source_url
source_type
updated_at
method
sample_size
```

`source_type` 권장값:

```text
official
official_estimate
commercial
commercial_estimate
manual_observation
derived
fixture
```

fixture는 개발과 demo에 사용할 수 있지만 실제 공공데이터 또는 카드매출처럼 표시하지 않는다.

## 9. 주의사항

### 좌표계

일반음식점/휴게음식점 인허가 데이터는 좌표계가 WGS84가 아닐 수 있다. 원본 좌표와 변환 좌표를 모두 저장한다.

```text
raw_x
raw_y
lat
lng
coordinate_system
```

### 서울 생활인구

서울 생활인구는 추정 데이터다.

주의:

```text
OpenAPI/Sheet는 최근 2개월 제공
값은 실제 보행량이 아니라 존재 인구 추정치
정밀 절대값보다 시간대별 패턴 비교에 사용
```

### 관평동 수동 관찰값

관평동 수동 관찰값은 공공데이터가 아니다.

따라서 `source_type`을 명확히 구분한다.

```text
source_type: manual_observation
```

### 좌석 정보

일반 상권·인허가 데이터에서 좌석 수가 제공된다고 가정하지 않는다.

확보 방식:

```text
직접 관찰
점포 공식 정보
점주 입력
```

확인하지 못한 좌석 수는 면적 등으로 임의 추정하지 않고 `정보 없음`으로 표시한다.

### 순위와 종합분석

지역별 매출 순위에는 비교 집합을 저장한다.

```text
대상 지역 범위
대상 업종
기준 기간
비교 점포 또는 상권 수
동점 처리 방식
```

종합분석은 source가 아니라 정의된 지표의 결과다. 원본과 파생값을 구분하고, LLM에는 계산 결과와 출처 metadata를 함께 전달한다.

## 10. 최종 판단

v0.1에는 다음 조합이면 충분하다.

```text
필수 4종:
소상공인시장진흥공단 상권정보
일반음식점 인허가
휴게음식점 인허가
서울 생활인구

추가:
지도/경계 데이터
관평동 수동 관찰값
관평동 3D asset
```

이 조합으로 만들 수 있는 화면:

```text
상권 선택
지도 표시
점포 마커
업종 필터
반경별 경쟁 강도
개업/폐업 흐름
시간대별 수요
입지 점수
해석 리포트
관평동 3D 데모 버튼
```

단, 관평동 시간대별 유동은 공공데이터가 아니라 수동 관찰값 기반이라고 명시해야 한다.

## 11. 공식 참고 링크

- [소상공인시장진흥공단 상권정보](https://www.data.go.kr/tcs/eds/selectCoreDataView.do?coreDataInsttCode=B553077&coreDataSn=1)
- [행정안전부 식품 일반음식점 조회서비스](https://www.data.go.kr/data/15154916/openapi.do)
- [행정안전부 식품 휴게음식점 조회서비스](https://www.data.go.kr/data/15154921/openapi.do)
- [행정동 단위 서울 생활인구](https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do)
- [브이월드 2D 데이터 API](https://www.vworld.kr/dev/v4dv_2ddataguide2_s002.do)

## 12. API 신청 및 수집 준비

2026-07-10에 실제 API 수집 전 공식 제공 항목을 다시 확인했다. 이 절의
`준비 완료`는 인증키를 받기 전의 코드와 문서 준비 상태를 뜻하며, 실제 데이터
확보 완료를 뜻하지 않는다.

### 12.1 서울 상권분석 Open API: 데모 우선 조합

서울에서 상권 분석 데모를 먼저 만들 때는 상권영역 API로 상권 코드를 얻고,
나머지 지표를 같은 `기준_년분기_코드`로 묶는다. 상권영역 API에는 기간 filter를
붙이지 않는다.

| 용도 | 서울 Open API service | 데이터셋 |
| --- | --- | --- |
| 상권 코드와 영역 | `TbgisTrdarRelm` | [영역-상권](https://data.seoul.go.kr/dataList/OA-15560/A/1/datasetView.do) |
| 업종별 점포, 개업/폐업, 프랜차이즈 | `VwsmTrdarStorQq` | [점포-상권](https://data.seoul.go.kr/dataList/OA-15577/A/1/datasetView.do) |
| 업종별 추정매출 | `VwsmTrdarSelngQq` | [추정매출-상권](https://data.seoul.go.kr/dataList/OA-15572/A/1/datasetView.do) |
| 상권 생활인구 | `VwsmTrdarFlpopQq` | [길단위인구-상권](https://data.seoul.go.kr/dataList/OA-15568/A/1/datasetView.do) |
| 상권 상주인구 | `VwsmTrdarRepopQq` | [상주인구-상권](https://data.seoul.go.kr/dataList/OA-15584/A/1/datasetView.do) |
| 상권 직장인구 | `VwsmTrdarWrcPopltnQq` | [직장인구-상권](https://data.seoul.go.kr/dataList/OA-15569/A/1/datasetView.do) |

서울시 상권 추정매출은 개별 카드 결제 원본이 아니다. 카드사 기반의 집계·추정
매출이며, 화면에는 `카드사 기반 추정매출`로 표시한다. 서울시가 2026-07-03에
고지한 기준에 따르면 표준단위구역 매출은 2021년 이후 자료를 제공한다.

생활인구도 실제 개인의 이동 위치나 정확한 보행자 수가 아니라 집계된 생활인구다.
따라서 지도와 리포트에서 `생활인구`라는 명칭과 집계 단위를 함께 표시한다.

### 12.2 공공데이터포털: 점포 marker와 인허가 보강

아래 세 항목은 공공데이터포털에서 같은 계정으로 활용신청한다.

| 용도 | 데이터셋 | 신청 후 사용 |
| --- | --- | --- |
| 개별 점포 marker와 업종 분류 | [소상공인시장진흥공단 상가(상권)정보 API](https://www.data.go.kr/data/15012005/openapi.do) | 반경 조회, 업종 코드, 위도/경도 |
| 일반음식점 인허가·영업 상태 | [행정안전부 식품 일반음식점 조회서비스](https://www.data.go.kr/data/15154916/openapi.do) | 개업/폐업 흐름, 영업 상태 |
| 카페·휴게음식점 인허가·영업 상태 | [행정안전부 식품 휴게음식점 조회서비스](https://www.data.go.kr/data/15154921/openapi.do) | 카페 계열 개업/폐업 흐름 |

2026-07-10 조사 기준으로 세 공공데이터포털 API는 개발계정 자동승인과 일 10,000
트래픽을 안내한다. 실제 승인 조건과 응답 필드는 신청 뒤 Swagger와 첫 응답으로 다시
검증한다.

### 12.3 신청과 로컬 설정 순서

1. 공공데이터포털에서 표의 세 API에 `활용신청`한다.
2. 서울 열린데이터광장에서 Open API 인증키를 발급한다.
3. 프로젝트 루트에서 `.env.example`을 복사해 `.env`를 만들고 키를 넣는다.

```powershell
Copy-Item .env.example .env
```

```text
PUBLIC_DATA_SERVICE_KEY=<공공데이터포털 service key>
SEOUL_OPEN_DATA_KEY=<서울 열린데이터광장 인증키>
```

키는 이 채팅, source code, Git commit, `VITE_` 환경변수에 넣지 않는다. 브라우저는
향후 FastAPI의 분석 API만 호출하며, provider API를 직접 호출하지 않는다.

### 12.4 첫 raw snapshot 수집

인증키를 넣은 뒤 먼저 기간 filter 없이 첫 응답을 받아 현재 제공되는
`STDR_YYQU_CD` 값을 확인한다. 서울 Open API 안내의 서비스별 추가 요청 인자는
선택 사항이므로, `--period`를 생략한 호출은 최신 제공 상태를 탐색하는 용도로 쓴다.
아래의 `20251`은 기간 filter 형식 예시일 뿐 최신 데이터라고 가정하지 않는다.

```powershell
uv run --directory apps/api python -m localtwin_api.seoul_open_data --allow-official-http

# 특정 분기만 다시 수집할 때
uv run --directory apps/api python -m localtwin_api.seoul_open_data --period 20251 --allow-official-http

# pagination으로 선택 source의 전체 row를 저장할 때
uv run --directory apps/api python -m localtwin_api.seoul_open_data --period 20251 --all --allow-official-http
```

수집기는 다음 경로에 각 API의 원본 row와 manifest를 저장한다.

```text
data/raw/seoul-market/<UTC timestamp>/
  areas.json
  stores.json
  sales.json
  flow.json
  manifest.json
```

기본값은 source 하나당 최대 1,000 rows만 저장하는 탐색 snapshot이다. `manifest.json`의
`truncated`가 `true`이면 전체 데이터가 아니므로 분석 결과나 전체 상권 수로 사용하지
않는다. `--all`을 명시하면 provider의 page를 끝까지 호출하고, `truncated: false`와
provider row 수 일치가 확인된 snapshot만 전체 분석 입력으로 사용한다.

서울 열린데이터광장이 현재 문서화한 Open API endpoint는 `http://`와 port `8088`을
사용하며 인증키를 URL 경로에 포함한다. 그래서 수집기는 browser route가 아니라 로컬
CLI로만 제공하고, `--allow-official-http`을 명시해야 실제 요청을 보낸다. 공용 또는
신뢰할 수 없는 네트워크에서는 이 명령을 실행하지 않는다.

### 12.5 변경 기록

| 날짜 | Task | 변경 | 상태 |
| --- | --- | --- | --- |
| 2026-07-10 | DATA-001 | 공식 API 서비스명, 신청 목록, local raw snapshot 절차를 추가 | 인증키 대기 |
| 2026-07-10 | DATA-001 | 서울 상권영역·점포·추정매출·생활인구 `20251` 전체 101,110행 raw snapshot 저장 | 서울 수집 완료, 공공데이터포털 key 대기 |
