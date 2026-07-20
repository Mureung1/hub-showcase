# Master Dataset Specification

> Python ETL과 Express API의 계약 문서
> 
> 최종 업데이트: 2026-07-20

---

## Master Dataset 개요

Master Dataset은 sales와 waste 데이터를 통합하고 **카테고리+월 단위로 집계**한 CSV 파일입니다.

**파일명**: `data/master/merged_dataset.csv`

**용도**: Financial 계산, Dashboard/Analysis 데이터 소스

**데이터 구조**: Category × Month (4카테고리 × 6개월 = 24행)

---

## 컬럼 정의

| 컬럼 | 출처 | 자료형 | 설명 | 비고 |
|------|------|--------|------|------|
| `month` | sales | STRING | 월 | "01"~"06" |
| `category` | sales | STRING | 카테고리 | 김밥/도시락/주먹밥/햄버거샌드위치 |
| `sales_qty` | sales | INT | 판매수량 합계 | sum(월별 판매수량) |
| `sales_amount` | sales | INT | 판매금액 합계 | sum(월별 판매금액) |
| `avg_selling_price` | sales | INT | 평균판매가 | sales_amount ÷ sales_qty |
| `waste_qty` | waste | INT | 폐기수량 합계 | sum(월별 폐기수량) |
| `waste_amount` | waste | INT | 폐기금액 합계 | sum(월별 폐기금액) |
| `avg_unit_cost` | waste | INT | 카테고리 평균원가 | 폐기 이력 상품들의 평균 원가 |
| `avg_cost_rate` | 계산 | FLOAT | 카테고리 평균원가율 | avg_unit_cost ÷ avg_selling_price |
| `margin_amount` | 계산 | INT | 추정 마진액 | sales_amount - (sales_amount × avg_cost_rate) |
| `margin_rate` | 계산 | FLOAT | 추정 마진율 | (margin_amount ÷ sales_amount) × 100 |
| `waste_rate` | 계산 | FLOAT | 폐기율 | (waste_amount ÷ sales_amount) × 100 |
| `net_income` | 계산 | INT | 추정 순이익 | margin_amount - waste_amount |
| `net_rate` | 계산 | FLOAT | 추정 순이익율 | (net_income ÷ sales_amount) × 100 |

---

## 데이터 가공 규칙

### 월 (month)
- 형식: STRING "01"~"06"
- 이유: sales 데이터가 월 단위만 보유 (일자 정보 없음)

### 카테고리
- 김밥
- 도시락
- 주먹밥
- 햄버거샌드위치

### 판매 집계 (sales 소스)
- `sales_qty` = 월별 판매수량 합계
- `sales_amount` = 월별 판매금액 합계 (단위: 원)
- `avg_selling_price` = sales_amount ÷ sales_qty (월/카테고리별 평균 판매가)

### 폐기 집계 (waste 소스)
- `waste_qty` = 월별 폐기수량 합계
- `waste_amount` = 월별 폐기금액 합계 (단위: 원)
- `avg_unit_cost` = 폐기 이력이 있는 상품들의 평균 원가
  - 이유: 모든 상품에 폐기 기록이 있는 것은 아니므로, 폐기된 상품들의 원가를 대표값으로 사용 (`financial_calculation_spec.md` 참고)

### 재무 지표 (계산)
- `avg_cost_rate` = avg_unit_cost ÷ avg_selling_price (0.0~1.0, 예: 0.65 = 65%)
- 이후는 `financial_calculation_spec.md`의 계산 로직 참고

---

## 예시 행

```csv
month,category,sales_qty,sales_amount,avg_selling_price,waste_qty,waste_amount,avg_unit_cost,avg_cost_rate,margin_amount,margin_rate,waste_rate,net_income,net_rate
01,김밥,94,281400,2993,23,57098,1952,0.652,97827,34.8,20.3,40729,14.5
01,도시락,133,650973,4894,9,42934,3599,0.735,172227,26.5,6.6,129293,19.9
01,주먹밥,200,283656,1418,28,47023,915,0.645,100649,35.5,16.6,53626,18.9
01,햄버거샌드위치,231,733371,3174,37,110541,2097,0.661,248849,33.9,15.1,138308,18.9
```

---

## 검증 기준

- **총 row 수**: 24행 (4카테고리 × 6개월)
- **결측치**: 0 (모든 컬럼이 값을 가져야 함)
- **카테고리별 분포**: 각 카테고리마다 정확히 6행 (월 01~06)
- **원가율 범위**: 40% ~ 80% (비정상 값은 데이터 품질 이슈 신호)

---

## 기술 결정사항

| 항목 | 결정 | 사유 |
|------|------|------|
| 데이터 grain | **Category + Month** | sales-waste 상품명 매칭률 50.1%로 낮아, 개별 상품 매칭 불가능. 향후 상품별 분석(P1)은 별도 상품 master 유지 |
| Date 컬럼 | `month` STRING으로 변경 | sales 데이터에 일자 정보 없음 (월 단위만) |
| selling_price 출처 | **sales 파일** (평균판매가) | inventory 정가는 sales 실제가와 8~18% 차이 (VAT+할인로 인한 괴리) |
| 원가 데이터 | **waste 파일만** 사용 | inventory에는 원가 정보 없음. waste의 폐기 이력 상품들의 원가를 카테고리 평균으로 추정 |

---

## 생성 방법

1. `data/scripts/sales_parser.py` 실행 → `data/master/sales.csv` (상품별)
2. `data/scripts/waste_parser.py` 실행 → `data/master/waste.csv` (상품별)
3. `data/scripts/master_dataset_builder.py` 실행 → `data/master/merged_dataset.csv` (카테고리+월 집계)

---

*이 문서는 Python ETL과 Express API 개발 시 공통 기준입니다. 변경 시 양쪽에 공지하세요.*
