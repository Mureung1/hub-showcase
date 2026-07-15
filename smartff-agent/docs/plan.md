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

## 포함

- 판매 데이터 업로드
- 발주 데이터 업로드
- 폐기 데이터 업로드
- 데이터 누적 저장
- Product Master 기반 데이터 통합
- Master Dataset 생성
- 판매 패턴 분석
- 관리회계 기반 분석
- Today's Decision Brief
- AI Recommendation

## 제외

- GS25 API 연동
- 자동발주 기능
- 실시간 POS 연동
- 실시간 재고 조회
- 머신러닝 기반 수요예측
- 발주 자동 실행
- 정밀 손익 계산
- What-if 시뮬레이션

---

# 14. MVP 성공 기준

다음 조건을 만족하면 MVP가 성공한 것으로 판단한다.

- 데이터를 업로드할 수 있다.
- 데이터를 통합하여 Master Dataset을 생성할 수 있다.
- 판매 패턴을 분석할 수 있다.
- 관리회계 정보를 제공할 수 있다.
- Today's Decision Brief를 생성할 수 있다.
- AI Recommendation을 생성할 수 있다.
- 점주가 이를 참고하여 최종 발주를 결정할 수 있다.

---

# 15. 향후 발전 방향

- GS25 자동발주 결과 비교
- 날씨 데이터 연동
- 행사 일정 반영
- 계절성 분석
- 점포별 맞춤 추천
- What-if 시뮬레이션
- 손익 영향 분석
- 발주 효과 분석

---

*Last Updated: 2026-07-08*