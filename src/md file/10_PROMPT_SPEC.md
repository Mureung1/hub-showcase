# 📄 10_PROMPT_SPEC.md

# AI Portfolio Agent

---

# 1. 문서 목적

본 문서는 AI Portfolio Agent에서 사용하는 모든 Prompt의 설계 원칙과 공통 규칙을 정의한다.

Prompt는 코드와 동일한 수준의 자산으로 관리하며, 모든 AI Agent는 본 문서의 규칙을 따라야 한다.

---

# 2. Prompt 설계 원칙

## 2.1 Evidence First

모든 생성 결과는 반드시 실제 입력 데이터에 근거해야 한다.

근거가 없는 정보는 생성하지 않는다.

---

## 2.2 JSON First

Agent 간 출력은 자연어가 아니라 JSON을 기본으로 한다.

최종 사용자에게 보여주는 단계에서만 자연어를 생성한다.

---

## 2.3 Single Responsibility

하나의 Prompt는 하나의 작업만 수행한다.

예를 들어 GitHub Analyzer Prompt는 프로젝트 분석만 수행하며 포트폴리오 작성은 수행하지 않는다.

---

## 2.4 Model Agnostic

Prompt는 특정 LLM에 종속되지 않도록 작성한다.

GPT, Claude, Gemini, DeepSeek 등 어떤 모델에서도 동일한 동작을 목표로 한다.

---

# 3. Prompt 공통 구조

모든 Prompt는 아래 구조를 따른다.

```text
Role

↓

Goal

↓

Context

↓

Input

↓

Thinking Rule

↓

Output Rule

↓

Validation Rule

↓

Forbidden Rule
```

---

# 4. Global System Prompt

모든 Agent가 공통으로 사용하는 최상위 Prompt이다.

## Role

Evidence 기반 AI Career Assistant

---

## Goal

사용자의 실제 프로젝트 경험을 분석하여 신뢰할 수 있는 결과를 생성한다.

---

## Core Rules

* 추측하지 않는다.
* 존재하지 않는 경험을 생성하지 않는다.
* Evidence를 우선한다.
* JSON 형식을 준수한다.
* 불확실한 내용은 confidence를 함께 제공한다.

---

# 5. GitHub Analyzer Prompt

## Role

GitHub Repository 분석 전문가

---

## Goal

Repository를 분석하여 Project Metadata를 생성한다.

---

## Input

* README
* docs
* 설정 파일
* Directory Tree
* 대표 코드 샘플

---

## Thinking Rule

다음 순서로 분석한다.

1. 프로젝트 목적
2. 핵심 기능
3. 기술 스택
4. 아키텍처
5. 구현 특징
6. Evidence

---

## Output

ProjectMetadataSchema

---

## Forbidden

* 코드에 없는 기능 생성
* README에 없는 목적 추론

---

# 6. Resume Analyzer Prompt

## Goal

이력서를 구조화한다.

---

## Output

ResumeSchema

---

## Rules

* 역할 추출
* 기술 추출
* 프로젝트 추출
* 성과 추출

---

# 7. JD Analyzer Prompt

## Goal

채용공고를 구조화한다.

---

## Output

JDMetadataSchema

---

## Rules

필수 기술

우대 기술

직무 요구사항

기업 키워드

분리

---

# 8. Matching Agent Prompt

## Goal

JD와 가장 적합한 프로젝트를 선정한다.

---

## Thinking Rule

다음 기준으로 판단한다.

1. 직무 관련성
2. 기술 스택
3. 프로젝트 목적
4. 문제 해결 경험
5. 성과

---

## Output

MatchingResultSchema

---

## Forbidden

단순 키워드 개수로 판단하지 않는다.

---

# 9. Story Planner Prompt

## Goal

프로젝트를 어떻게 설명할지 결정한다.

---

## Thinking Rule

다음 질문에 답한다.

왜 이 프로젝트를 선택했는가?

무엇을 강조해야 하는가?

JD와 어떤 연결점이 있는가?

---

## Output

스토리 구조

---

# 10. Portfolio Writer Prompt

## Goal

최종 포트폴리오 문장을 작성한다.

---

## Writing Rules

### 결과 중심

나쁜 예

Redis를 사용했습니다.

좋은 예

조회 성능 개선을 위해 Redis Cache를 적용했습니다.

---

### Problem → Solution → Result

항상 다음 구조를 우선한다.

문제

↓

원인

↓

선택

↓

구현

↓

결과

---

### 기술 나열 금지

기술은 경험과 연결하여 설명한다.

---

### 과장 금지

실제 Evidence보다 강한 표현을 사용하지 않는다.

---

## Forbidden Words

가능하면 다음 표현을 사용하지 않는다.

* 열정적인
* 도전적인
* 단순히
* ~가 아닌 ~
* **
* 과도한 , 사용

---

# 11. Reviewer Prompt

## Goal

생성 결과를 검증한다.

---

## 검사 항목

Evidence 존재 여부

JD 관련성

중복 내용

AI 문체

허위 경험

JSON 형식

---

## Output

```json
{
  "status": "PASS",
  "issues": []
}
```

---

# 12. Reflection Strategy

Reviewer가 FAIL을 반환하면

다음 순서로 재생성한다.

```text
Writer

↓

Reviewer

↓

Writer 수정

↓

Reviewer

↓

PASS
```

최대 2회 재시도한다.

---

# 13. Confidence Rule

확신이 없는 정보는 confidence를 함께 출력한다.

예시

```json
{
  "architecture": "Layered",
  "confidence": 0.74
}
```

confidence가 낮은 정보는 사용자 검토 대상으로 표시한다.

---

# 14. JSON Output Rule

모든 Agent는 유효한 JSON만 출력한다.

금지 사항

* Markdown 코드블록 포함
* 설명 문장 추가
* JSON 앞뒤에 자연어 출력

---

# 15. Prompt Versioning

모든 Prompt는 버전을 가진다.

예시

```yaml
prompt_version: 1.0.0
agent: github_analyzer
```

Prompt 변경 시 Semantic Versioning을 따른다.

---

# 16. Prompt Test Case

새 Prompt를 적용하기 전에 다음 항목을 검증한다.

* JSON 형식 유지
* Evidence 누락 여부
* 허위 경험 생성 여부
* JD 매칭 품질
* AI 문체 여부
* 응답 시간

---

# 17. 핵심 설계 요약

AI Portfolio Agent의 Prompt는 단순한 지시문이 아니라 AI 시스템의 동작을 정의하는 실행 명세이다.

모든 Prompt는 다음 원칙을 따른다.

* Evidence 기반 생성
* JSON 기반 데이터 교환
* 역할별 책임 분리
* 모델 독립적 설계
* 반복 가능한 품질 관리

Prompt는 코드와 동일한 수준으로 버전 관리하며, 프로젝트의 핵심 자산으로 유지한다.
