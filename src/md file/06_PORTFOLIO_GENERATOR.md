# 📄 06_PORTFOLIO_GENERATOR.md

# AI Portfolio Agent

---

# 1. 문서 목적

본 문서는 AI Portfolio Agent의 Portfolio Generator가 포트폴리오를 생성하는 전체 과정을 정의한다.

Portfolio Generator는 단순히 문장을 생성하는 기능이 아니라, 사용자의 실제 프로젝트 경험을 채용공고에 맞게 재구성하여 제출 가능한 포트폴리오를 생성하는 것을 목표로 한다.

모든 생성 결과는 Project Metadata와 Resume, JD 분석 결과를 근거로 작성되어야 한다.

---

# 2. Portfolio Generator의 목표

Portfolio Generator는 다음 네 가지 목표를 가진다.

1. 실제 경험을 기반으로 작성한다.
2. 채용공고와 가장 관련성이 높은 내용을 강조한다.
3. AI 특유의 문체를 최소화한다.
4. 사용자가 최소한의 수정만으로 제출할 수 있는 품질을 목표로 한다.

---

# 3. 입력 데이터

Portfolio Generator는 아래 데이터를 입력으로 사용한다.

```text
Project Metadata
        +
Resume Metadata
        +
JD Metadata
        +
Matching Result
```

모든 입력 데이터는 이전 Agent에서 생성된 구조화된 JSON을 사용한다.

---

# 4. 내부 생성 Pipeline

Portfolio Generator는 다음 순서로 동작한다.

```text
Input

↓

Story Planning

↓

Portfolio Composition

↓

Writing Optimization

↓

Evidence Validation

↓

Marp Rendering

↓

Output
```

---

# 5. Story Planning

## 목적

JD에 맞는 프로젝트 스토리를 설계한다.

단순히 프로젝트를 나열하는 것이 아니라,

"왜 이 프로젝트를 선택했는가"

"무엇을 강조해야 하는가"

를 먼저 결정한다.

---

### 입력

* JD Metadata
* Matching Result

---

### 출력

예시

```json
{
  "selected_project": "AI Portfolio Agent",
  "highlight": [
    "LLM",
    "Agent",
    "FastAPI"
  ],
  "story": "AI Agent 설계 경험을 중심으로 설명"
}
```

---

# 6. Portfolio Composition

## 목적

포트폴리오의 전체 슬라이드 구조를 생성한다.

기본 구성은 다음과 같다.

```text
1. Cover

↓

2. About Me

↓

3. Tech Stack

↓

4. Project Overview

↓

5. Problem

↓

6. Solution

↓

7. Architecture

↓

8. Key Features

↓

9. Trouble Shooting

↓

10. Result

↓

11. Conclusion
```

필요에 따라 일부 슬라이드는 추가 또는 제거할 수 있다.

---

# 7. Writing Optimization

## 목적

포트폴리오 문장을 자연스럽게 다듬는다.

---

## 작성 원칙

### 결과 중심

좋지 않은 예

```
Redis를 적용했습니다.
```

좋은 예

```
상품 조회 API 응답 시간을 줄이기 위해 Redis 캐싱을 적용했습니다.
```

---

### 문제 → 해결 → 결과

모든 프로젝트 설명은 가능한 한 다음 구조를 따른다.

```text
문제

↓

원인

↓

선택

↓

구현

↓

결과
```

---

### 기술 나열 금지

나쁜 예

```
Spring Boot

Redis

Docker

Kafka
```

좋은 예

```
Redis를 도입하여 조회 성능을 개선하고 Docker 기반으로 배포 환경을 구성했습니다.
```

---

### 금지 표현

다음 표현은 가능한 한 사용하지 않는다.

* 열정적인
* 도전적인
* ~가 아니라 ~이다 형태의 과도한 단정 문장
* 의미 없는 수식어
* **로 강조
* 과도한 , 사용

---

### 근거 없는 성과 금지

잘못된 예

```
성능이 40% 향상되었습니다.
```

근거 없음

↓

생성 금지

---

# 8. Evidence Validation

모든 슬라이드는 Evidence를 가진다.

예시

```json
{
  "slide": "Architecture",
  "evidence": [
    "README.md",
    "docs/architecture.md",
    "Dockerfile"
  ]
}
```

Evidence가 없는 내용은 자동 생성 대상에서 제외하거나 낮은 신뢰도로 표시한다.

---

# 9. Marp Rendering

생성된 내용을 Marp Markdown 형식으로 변환한다.

예시

```markdown
---
# AI Portfolio Agent

---

## Project Overview

AI 기반 맞춤형 포트폴리오 생성 서비스

---

## Tech Stack

- FastAPI
- Next.js
- LangGraph
```

생성된 Markdown은 PDF 및 PPT 변환의 원본이 된다.

---

# 10. 출력 형식

지원 출력 형식

* Markdown (.md)
* PDF
* PPT

향후 확장

* HTML
* Notion Export
* Google Slides

---

# 11. 품질 기준

생성 결과는 다음 기준을 만족해야 한다.

### 정확성

모든 내용은 실제 프로젝트를 기반으로 한다.

### 관련성

JD와 관련된 내용이 우선적으로 포함된다.

### 자연스러움

AI 특유의 문체를 최소화한다.

### 일관성

슬라이드 간 내용이 서로 충돌하지 않는다.

### 검증 가능성

모든 핵심 주장에는 Evidence가 존재한다.

---

# 12. 실패 처리

### 프로젝트 정보 부족

가능한 범위에서 생성하고 부족한 부분은 사용자에게 수정 요청한다.

### Evidence 부족

근거 없는 내용은 생성하지 않는다.

### JD 분석 실패

기본 포트폴리오를 생성하고 JD 맞춤 기능은 제외한다.

---

# 13. MVP 구현 범위

초기 버전에서는 다음 기능을 구현한다.

* 기본 슬라이드 구성
* JD 맞춤 프로젝트 강조
* Marp Markdown 생성
* PDF/PPT 출력
* Evidence 기반 문장 생성

---

# 14. 향후 확장

향후에는 다음 기능을 추가할 수 있다.

* 기업별 템플릿 자동 선택
* 직무별 슬라이드 구성 변경
* 디자인 테마 지원
* 다국어 포트폴리오 생성
* 발표용 스크립트 자동 생성
* 포트폴리오 품질 점수 제공

---

# 15. 최종 역할 정의

Portfolio Generator는 단순한 문서 생성기가 아니다.

사용자의 실제 프로젝트 경험을 채용공고와 연결하여 설득력 있는 스토리로 재구성하고, 제출 가능한 형태의 포트폴리오로 완성하는 최종 AI Agent이다.

최종 목표는 다음과 같다.

```text
Project Metadata

↓

Story

↓

Portfolio Structure

↓

Natural Writing

↓

Evidence Validation

↓

Marp Document

↓

PDF / PPT
```

Portfolio Generator는 AI Portfolio Agent의 최종 사용자 경험을 결정하는 핵심 구성 요소이며, 생성 품질은 프로젝트 전체의 완성도를 좌우한다.
