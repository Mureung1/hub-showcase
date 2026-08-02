# SmartFF Agent

> **"AI가 발주를 대신하는 것이 아니라, 점주가 더 나은 발주 의사결정을 할 수 있도록 돕는다."**

판매·발주·폐기 데이터를 통합 분석하여 점주의 발주 의사결정을 지원하는 **관리회계 기반 AI Decision Support System(DSS)**

---

# Core Value

SmartFF Agent는 GS25 자동발주 시스템을 대체하는 서비스가 아니다.

GS25는 이미 자동발주 시스템을 통해 발주 수량을 제안하고 있으며,
점주는 이를 참고하여 최종 발주를 결정한다.

SmartFF는 자동발주 결과를 대신 계산하는 것이 아니라,

판매 데이터,
발주 데이터,
폐기 데이터를 분석하여

점주가 **왜 이러한 발주 판단을 해야 하는지**를 설명하고,
더 합리적인 의사결정을 내릴 수 있도록 지원하는 것을 목표로 한다.

AI는 발주를 대신하지 않는다.

AI는 데이터를 분석하고,
판매 패턴과 폐기 위험을 해석하며,
점주가 최종 의사결정을 내릴 수 있도록 근거를 제공한다.

---

# 1. 프로젝트 개요

## 프로젝트명

SmartFF Agent

## 프로젝트 소개

GS25 FF 데이터를 분석하여

판매 패턴과 관리회계 정보를 제공하고

점주의 발주 의사결정을 지원하는
AI Decision Support System(DSS)

## 프로젝트 목표

판매 데이터,
발주 데이터,
폐기 데이터를 통합 분석하여

점주에게

- Today's Decision Brief
- 판매 패턴 분석
- 관리회계 기반 Financial Insight
- AI Recommendation

을 제공하고

데이터 기반의 발주 의사결정을 지원한다.

---

# 2. 문제 정의

GS25는 FF 상품에 대해 자동발주 시스템을 운영하고 있다.

하지만 실제 점포에서는 자동발주 결과만으로 발주를 완료하지 않는다.

점주는

- 판매 경험
- 최근 판매 흐름
- 폐기 현황
- 상권
- 행사

등을 함께 고려하여
최종 발주를 결정한다.

그러나 이러한 데이터를 동시에 분석하기는 쉽지 않으며,
결국 경험과 직관에 의존하는 경우가 많다.

SmartFF는 판매·발주·폐기 데이터를 통합 분석하여

점주가 데이터 기반으로 더 합리적인 의사결정을 내릴 수 있도록 지원한다.

---

# 3. GS25 자동발주와의 차별점

GS25 자동발주 시스템은

발주 수량을 계산하여 제안하는 기능에 집중되어 있다.

SmartFF는

발주 수량을 대신 계산하는 것이 아니라

**왜 이러한 판단을 해야 하는지**

를 설명하는 데 초점을 맞춘다.

AI는

- 판매 추세
- 폐기 위험
- 마진 정보

를 종합 분석하여

점주가 최종 판단을 내릴 수 있는 근거를 제공한다.

---

# 4. 타겟 사용자

대표 사용자는 GS25 편의점 점주이다.

특히

- FF 상품 발주를 직접 관리하는 점주
- 자동발주 이후 발주량을 조정하는 점주

를 주요 사용자로 설정한다.

---

# 5. 서비스 컨셉

SmartFF는

자동발주 시스템을 대체하는 서비스가 아니라

점주의 최종 발주 의사결정을 지원하는

**관리회계 기반 AI Decision Support System(DSS)** 이다.

Decision Engine이

판매 패턴과 관리회계 정보를 분석하고,

LLM은

그 결과를 자연어로 해석하여

점주에게 AI Recommendation을 제공한다.

---

# 6. 시스템 아키텍처

## 기획 시점 구상

```
판매 데이터
        │
발주 데이터
        │
폐기 데이터
        │
Product Master
        │
        ▼
데이터 전처리
        ▼
Master Dataset
        ▼
Decision Engine
        ▼
Today's Decision Brief
        ▼
AI Recommendation
        ▼
점주의 최종 발주 의사결정
```

## 실제 구현 (v1.0, MVP 완료 시점 기준)

```
Raw Excel (판매/폐기)
        │
        ▼  Python ETL (data/scripts)
Master Dataset (카테고리 × 월 집계, merged_dataset.csv)
        │
        ▼  CsvDataRepository
FinancialService (마진/폐기율/순이익 집계)
        │
        ▼
Express API (/api/financial, /api/recommendations, /api/patterns)
        │
        ▼
React Frontend (Dashboard / Analysis / Financial / Upload)
```

기획 당시엔 상품 단위 Product Master로 판매·발주·폐기를 매칭할 계획이었으나,
waste↔inventory 상품코드 매칭률이 월/카테고리별로 13~100%까지 크게 흔들려
(`docs/tasks.md` 3주차 Risk 참고) 상품 단위 매칭을 포기하고
**카테고리 + 월 단위 집계**로 설계를 변경했다. 발주(orders) 데이터는
업로드 기능만 있고 분석 파이프라인에는 아직 연결되지 않았다 (10번 항목 참고).

`DataRepository` 인터페이스로 데이터 접근을 추상화해두어, v2.0에서는
CSV 대신 Postgres(Supabase)로 교체하는 것을 전제로 설계했다
(`docs/architecture.md` 참고).

---

# 7. 데이터 구조

## 입력 데이터

- 판매 데이터
- 발주 데이터
- 폐기 데이터
- Product Master

## Product Master

모든 데이터를 연결하는 기준 테이블이다.

포함 정보

- 상품코드
- 상품명
- 카테고리
- 판매가(매가)
- 원가

각 데이터는 Product Master를 기준으로 통합되어 Master Dataset을 생성한다.

---

# 8. 핵심 기능 (MVP)

## 1. 데이터 업로드 및 누적 저장

사용자는

- 판매 데이터
- 발주 데이터
- 폐기 데이터

를 업로드할 수 있다.

업로드된 데이터는 누적 저장되어 지속적으로 분석에 활용된다.

> **구현 결과**: 판매·폐기 데이터는 업로드 즉시 ETL이 자동 실행되어 분석까지 연결된다.
> 발주 데이터는 업로드 자체는 지원하지만, 전용 파서가 아직 없어 분석·추천 로직에는
> 반영되지 않는다 (`frontend/src/pages/upload/UploadPage.tsx`에 "자동 검증 미지원(파서 없음)"으로
> 명시). 06월 데이터 기준 상품명 매칭률 85.9%를 확인해 파서 신규 작성은 가능한 것으로
> 조사됐으나 착수 전이다 (`docs/backlog.md` "발주 데이터 활용" 참고).

---

## 2. 판매 패턴 분석

카테고리별

- 요일별 판매 패턴
- 시간대별 판매 패턴
- 판매 추세

를 분석한다.

분석 결과는 AI Recommendation의 근거로 활용된다.

---

## 3. 관리회계 기반 분석

카테고리별

- 평균 마진
- 평균 마진율
- 폐기 손실

을 분석하여

수익성과 폐기 위험을 함께 제공한다.

---

## 4. Today's Decision Brief

최근 누적 데이터를 기반으로

오늘 우선적으로 확인해야 할 카테고리를 브리핑한다.

예시

> 최근 4주 데이터를 분석한 결과
>
> 도시락 카테고리의 판매 추세가 상승하고 있으며,
> 폐기 위험은 낮은 수준입니다.
>
> 오늘은 도시락 카테고리의 발주를 우선 확인하는 것을 권장합니다.

---

## 5. AI Recommendation

AI는 결과만 제시하지 않는다.

판매 패턴과 관리회계 정보를 바탕으로

추천 이유를 자연어로 설명하여

점주의 의사결정을 지원한다.

---

# 9. Decision Engine

SmartFF는

머신러닝 기반 수요예측 모델이 아닌

Rule-Based Decision Engine을 사용한다.

Decision Engine은

- 판매 추세
- 폐기 위험
- 마진 정보

를 종합 분석하여

Today's Decision Brief와

AI Recommendation을 생성한다.

Rule-Based 방식을 채택한 이유는

- 설명 가능성(Explainability)
- 안정성(Stability)
- 유지보수성(Maintainability)

을 확보하기 위함이다.

---

# 10. 사용자 시나리오

1. 점주가 SmartFF Agent에 접속한다.

2. 판매·발주·폐기 데이터를 업로드한다.

3. 시스템이 Product Master와 데이터를 통합하여 Master Dataset을 생성한다.

4. Decision Engine이 데이터를 분석한다.

5. Dashboard에서 Today's Decision Brief를 확인한다.

6. Analysis 화면에서 판매 패턴을 확인한다.

7. Financial 화면에서 마진과 폐기 손실을 확인한다.

8. AI Recommendation을 참고하여 최종 발주를 결정한다.

---

# 11. 화면 구성

## Dashboard

- Today's Decision Brief
- Category Priority
- AI Recommendation
- Financial Summary
- 기준 데이터(최근 업로드 기준)

> **구현 결과**: 위 기획을 `AIBriefCard`(AI 브리핑), `KPICard`(총매출/평균 마진율/폐기손실/추정
> 순이익), `RiskAlertCard`(위험 신호), `MarginBarList`(카테고리별 마진 기여도)로 구체화했다.
> 다만 데이터가 월 단위 집계라 매일 접속해도 같은 숫자만 보이는 한계가 있어, 점주의 실제
> 업무 흐름(오늘 발주 → 내일 입고 → 내일 판매) 기준 "운영 브리핑" 재설계가 다음 단계로
> 논의 중이다 (15번 항목 참고).

---

## Analysis

- 요일별 판매 패턴
- 시간대별 판매 패턴
- 판매 추세
- 폐기 추세

---

## Financial

- 평균 마진
- 평균 마진율
- 폐기 손실
- 카테고리별 추천 결과

---

## Upload

- 판매 데이터 업로드
- 발주 데이터 업로드
- 폐기 데이터 업로드
- 최근 업로드 내역

---


# 12. 프로토타입 (UI Preview)

본 프로토타입은 핵심 기능과 사용자 흐름을 검증하기 위해
**HTML, CSS 기반으로 제작한 MVP UI**입니다.

React 기반 개발 이전 단계에서 화면 구성과 사용자 경험(UI/UX)을 검증하는 것을 목적으로 하였습니다.

> 아래 스크린샷은 개발 착수 전(2026-07-08) 목업이며, 실제 배포된 화면과는 다르다.
> 실제 서비스 화면은 `https://smartfffrontend.vercel.app/`에서 직접 확인할 수 있다.

## Dashboard

> AI가 최근 누적 데이터를 분석하여 오늘 우선적으로 확인해야 할 카테고리와 발주 추천 기조를 제공하는 메인 화면

<img width="1894" height="911" alt="prototype_dashboard_v1 1" src="https://github.com/user-attachments/assets/d17bc77c-45ea-4aa5-89b1-84bd4a42c295" />
<img width="1640" height="361" alt="prototype_dashboard_v1 2" src="https://github.com/user-attachments/assets/3e247e54-dd5a-4cd0-8497-d386d3ab2220" />
<img width="1664" height="820" alt="prototype_dashboard_v1 3" src="https://github.com/user-attachments/assets/3767dc7d-ac1a-4b1a-a0dc-0173f016e24b" />


---

## Analysis

> 판매 데이터를 기반으로 요일별, 시간대별 판매 패턴과 판매·폐기 추세를 시각적으로 분석하는 화면

<img width="1885" height="805" alt="prototype_analysis_v1 1" src="https://github.com/user-attachments/assets/2d3796b2-df23-4b8c-a2a5-1aecb2a7151a" />
<img width="1644" height="800" alt="prototype_analysis_v1 2" src="https://github.com/user-attachments/assets/177e7049-be73-47d8-afc4-8a6cd1706c58" />

---

## Financial

> 관리회계 관점에서 카테고리별 마진, 폐기원가를 분석하고 발주 추천 근거를 제공하는 화면

<img width="1898" height="715" alt="prototype_financial_v1 1" src="https://github.com/user-attachments/assets/12c492ea-ca9c-4597-836a-e90253f79581" />
<img width="1638" height="662" alt="prototype_financial_v1 2" src="https://github.com/user-attachments/assets/f40de5df-280c-460b-8814-f0cf79965675" />

---

## Upload

> 판매, 발주, 폐기 데이터를 업로드하고 누적 분석을 위한 데이터를 관리하는 화면

<img width="1891" height="903" alt="prototype_upload_v1 1" src="https://github.com/user-attachments/assets/40de0e76-325e-478a-9924-4a2e9cfcf30c" />
<img width="1644" height="587" alt="prototype_upload_v1 2" src="https://github.com/user-attachments/assets/2d4735fd-5360-4df5-b251-613173ec8fdd" />


---

# 13. MVP 범위

## 포함 (2026-07-31 기준 실제 구현)

- 판매 데이터 업로드 및 자동 ETL 연동
- 발주 데이터 업로드 (분석 연동은 미포함, 위 8-1번 참고)
- 폐기 데이터 업로드 및 자동 ETL 연동
- 데이터 누적 저장 (Supabase Storage + `uploads` 테이블)
- 카테고리 + 월 단위 데이터 통합 (Product Master는 상품 단위 매칭률 문제로 이 방식으로 대체)
- Master Dataset 생성 (Python ETL, `merged_dataset.csv`)
- 판매 패턴 분석 (요일별/시간대별, 전 카테고리)
- 관리회계 기반 분석 (마진/마진율/폐기손실/순이익, 카테고리별)
- Dashboard AI 브리핑 · KPI · 위험 신호 · 마진 기여도
- Rule Engine V1 기반 AI Recommendation (판매 추세·폐기 위험·마진율 3개 규칙)

## 제외

- GS25 API 연동
- 자동발주 기능
- 실시간 POS 연동
- 실시간 재고 조회
- 머신러닝 기반 수요예측
- 발주 자동 실행
- 정밀 손익 계산
- What-if 시뮬레이션
- 로그인/인증, 멀티테넌시 (배포는 단일 매장 기준, 16번 항목 참고)

---

# 14. MVP 성공 기준

다음 조건을 만족하면 MVP가 성공한 것으로 판단한다.

- [x] 데이터를 업로드할 수 있다.
- [x] 데이터를 통합하여 Master Dataset을 생성할 수 있다.
- [x] 판매 패턴을 분석할 수 있다.
- [x] 관리회계 정보를 제공할 수 있다.
- [x] Today's Decision Brief를 생성할 수 있다.
- [x] AI Recommendation을 생성할 수 있다.
- [x] 점주가 이를 참고하여 최종 발주를 결정할 수 있다.
- [x] Vercel(프론트) + Render(백엔드)에 실제로 배포되어 링크로 접속할 수 있다.

모든 조건을 충족해 2026-07-31 기준 MVP를 완료로 판단한다.

---

# 15. 향후 발전 방향

2026-07-27~30 논의를 거쳐 정리한 실제 다음 단계 우선순위다
(자세한 배경과 미확정 사항은 `docs/backlog.md` 참고).

## P1 — 다음 착수 대상

- **주 단위(Weekly-grain) 데이터 전환**: 현재 월 단위 집계라 Dashboard를 매일 봐도 같은
  숫자만 보이는 문제 해결. 저장을 `period_start`/`period_end` 날짜 기반으로 바꿔 "최근
  7일/14일/한 달" 롤링 기간 분석을 지원. 기술 검토 완료, 발표 이후 착수 예정.
- **Dashboard 운영 브리핑 재설계**: "오늘 발주 → 내일 입고 → 내일 판매"라는 점주의 실제
  업무 흐름 기준으로 재구성. 위 데이터 전환이 선행 조건.

## P2 — 그 다음

- **Rule Engine V2 (발주 데이터 활용)**: 발주량 대비 실판매 괴리 + 폐기율 교차 규칙 추가.
  상품명 매칭률 85.9% 확인 완료, orders 전용 파서 신규 작성 필요.
- **로그인/멀티테넌시**: 현재는 인증이 전혀 없고 단일 매장(강남역점) 데이터만 지원하는
  구조. 다른 매장 점주도 쓰게 하려면 Supabase Auth 도입 + DB/파일/캐시 전반에
  store_id 관통이 필요 (`patternService.ts`의 싱글턴 캐시 등 멀티테넌시 없이는 깨지는
  지점 확인됨).
- 프론트엔드 번들 코드 스플리팅 (메인 청크 679KB 경고, 페이지별 `React.lazy()` 검토)

## P3 — 여력이 되면

- 폐기 요일/시간대 패턴 실데이터 연동 (원본 데이터 자체가 없어 보류 중)
- 배송편(1편/2편) 데이터 모델 확장
- Fuzzy Matching (sales/orders 상품명 유사 매칭)

## 장기적으로 고려할 수 있는 방향 (미착수, 우선순위 밖)

- GS25 자동발주 결과 비교
- 계절성 분석, 점포별 맞춤 추천
- What-if 시뮬레이션

---

# 16. 배포 현황 (2026-07-31)

- 프론트엔드: Vercel (`https://smartfffrontend.vercel.app/`)
- 백엔드: Render, Docker 기반 (Free 플랜)
- 데이터: Supabase (Storage + `uploads` 테이블), 배포 재시작 시 마스터 데이터셋이
  사라지는 문제를 해결해 영속화까지 확인함
- 현재는 인증 없는 단일 매장 배포. 다른 매장 지원은 15번 항목의 멀티테넌시 작업 이후 가능

---

*Last Updated: 2026-08-01 (프로젝트 완료 시점 회고 반영)*