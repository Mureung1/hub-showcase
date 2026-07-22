# SmartFF Agent

> AI가 발주를 대신하는 것이 아니라, 점주가 더 나은 발주 의사결정을 할 수 있도록 돕는 AI Decision Support System(DSS)

## 📄 Documents

- [Wiki](https://github.com/YunTaeYong/hub/wiki)
- [Project Plan](smartff-agent/docs/PROJECT_PLAN.md)
- [Discussion](smartff-agent/docs/DISCUSSION.md)
- [GitHub Issues](https://github.com/YunTaeYong/hub/issues)
## Repository

- Project Folder: `smartff-agent`

## Project Overview

SmartFF Agent는

판매 데이터,
발주 데이터,
폐기 데이터를 분석하여

GS25 점주의 발주 의사결정을 지원하는
관리회계 기반 AI Decision Support System(DSS)입니다.


# SmartFF 데이터 흐름 아키텍처

SmartFF는 **React(Frontend) - Express(Backend) - Python ETL - Supabase** 구조로 구성되어 있습니다.

현재 시스템은 데이터의 성격에 따라 **두 개의 데이터 흐름**을 사용합니다.

- **업로드 이력** → Supabase DB
- **재무/추천 분석 데이터** → Python ETL이 생성한 CSV

---

## 전체 아키텍처

<img width="961" height="608" alt="수요일 미션1" src="https://github.com/user-attachments/assets/445bd7a7-5396-4905-a128-040fdbe8966c" />
<img width="849" height="802" alt="수요일 미션2" src="https://github.com/user-attachments/assets/d347b5ce-b5f3-4bdc-a38d-e18a02f36785" />

---

## 데이터 흐름

### 1. 업로드 기능

```
UploadPage
      │
      ▼
POST /api/uploads
      │
      ▼
Express(uploadController)
      │
      ▼
Supabase uploads 테이블
```

- 업로드 이력 조회
- 업로드 등록
- 업로드 삭제

모든 데이터는 **Supabase**를 사용합니다.

---

### 2. 재무 분석 기능

```
원본 CSV(data/raw)

        │
        ▼

Python ETL
(sales_parser.py)
(waste_parser.py)

        │
        ▼

master_dataset_builder.py

        │
        ▼

merged_dataset.csv

        │
        ▼

FinancialService
(in-memory cache)

        │
        ▼

Financial API

        │
        ▼

Dashboard
Financial
Analysis
Recommendation
```

FinancialService는 서버 시작 시 `merged_dataset.csv`를 메모리로 읽어 캐싱합니다.

Dashboard, Financial, Analysis, Recommendation은 모두 동일한 데이터를 사용합니다.

---

## API 연결 구조

| 화면 | API |
|------|-----|
| Dashboard | `/api/financial/summary`, `/api/recommendations` |
| Analysis | `/api/financial/summary` |
| Financial | `/api/financial/summary` |
| Upload | `/api/uploads` |

---

## Recommendation 흐름

```
Dashboard

↓

GET /api/recommendations

↓

RecommendationService

↓

FinancialService

↓

merged_dataset.csv
```

RecommendationService는

- 카테고리 평균 폐기율
- 전체 평균 마진율
- 최신월 vs 전월 비교

를 기반으로 Rule Engine을 수행하여 추천 결과를 생성합니다.

---

## 현재 구조의 특징

### 업로드 데이터

- 실제 DB(Supabase)에 저장
- CRUD 가능

### 재무 데이터

- DB를 사용하지 않음
- Python ETL이 생성한 CSV 사용
- 서버가 CSV를 메모리에 캐싱하여 조회

---

## 현재 한계 (MVP)

현재 Upload와 ETL은 자동으로 연결되어 있지 않습니다.

현재 흐름

```
업로드

↓

Supabase 저장

↓

(수동)

Python ETL 실행

↓

merged_dataset.csv 생성

↓

(수동)

Backend 재시작

↓

FinancialService Cache 갱신
```

따라서 업로드 직후에는 Dashboard 및 Recommendation에 즉시 반영되지 않습니다.

---

## V2 개선 예정

향후에는 다음과 같이 자동화할 예정입니다.

```
Upload

↓

Python ETL 자동 실행

↓

merged_dataset.csv 갱신

↓

FinancialService reload()

↓

Dashboard 자동 반영
```

이를 통해 Upload부터 분석 결과까지 하나의 데이터 파이프라인으로 연결할 계획입니다.
