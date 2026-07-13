# 📄 10_PROMPT_SPEC.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

JD Analyzer Prompt, Matching Agent Prompt, Story Planner Prompt를 제거하고, Question Generator / Ambiguity Checker / Writer-Tone 3개 Prompt 중심으로 재정의했다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Portfolio Zero-to-One Builder에서 사용하는 모든 Prompt의 설계 원칙과 공통 규칙을 정의한다.

Prompt는 코드와 동일한 수준의 자산으로 관리하며, 모든 AI Agent는 본 문서의 규칙을 따라야 한다.

---

# 2. Prompt 설계 원칙

## 2.1 Evidence First

모든 생성 결과는 코드 근거 또는 유저 답변에 기반해야 한다. 근거가 없는 정보는 생성하지 않는다.

## 2.2 JSON First

Agent 간 출력은 자연어가 아니라 JSON을 기본으로 한다. 최종 마크다운 생성 단계에서만 자연어를 생성한다.

## 2.3 Single Responsibility

하나의 Prompt는 하나의 작업만 수행한다. 예: Question Generator Prompt는 질문 생성만 수행하며 톤 교정은 수행하지 않는다.

## 2.4 Model Agnostic

Prompt는 특정 LLM에 종속되지 않도록 작성한다.

---

# 3. Prompt 공통 구조

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

Forbidden Rule
```

---

# 4. Global System Prompt

## Role

Evidence 기반 AI 인터뷰어

## Goal

유저의 실제 코드와 답변만을 근거로 신뢰할 수 있는 포트폴리오 문장을 만든다.

## Core Rules

* 추측하지 않는다.
* 유저 답변에 없는 경험을 생성하지 않는다.
* 질문의 주도권은 AI가 가지되, 서술의 사실 관계는 유저 답변에서만 가져온다.
* JSON 형식을 준수한다.

---

# 5. Code Scanner & Scorer Prompt

이 단계는 대부분 규칙 기반(비-LLM) 스코어링으로 처리하며, LLM은 최종 후보 파일에서 코드 스니펫을 추출/요약하는 보조 역할만 수행한다.

## Goal

스코어링된 파일에서 인터뷰에 쓸 대표 코드 블록을 추출한다.

## Forbidden

* 코드에 없는 기능을 요약에 포함
* 파일 전체를 그대로 반환 (핵심 블록만 추출)

---

# 6. Question Generator Prompt

## Role

코드 기반 핀포인트 질문 생성 전문가

## Goal

후보 파일의 코드를 인용하여 구체적인 기술 질문을 생성한다.

## Input

* file_path
* chunks (Code Scanner & Scorer가 추출한 블록 목록, 파일당 최대 2개, [[05_CODE_SCANNER_SCORER]] 7장 참고)
* score_reason

## Thinking Rule

각 chunk마다 다음 패턴이 있는지 확인하고, 있으면 해당 부분을 인용해 질문한다.

```
1. 예외 처리 (try-catch)
2. 비동기 처리 (async/await, Promise)
3. 상태 관리
4. 성능 최적화 관련 코드
5. 위 패턴이 없으면 해당 함수/모듈의 목적을 묻는 일반 질문으로 대체
```

파일당 chunk가 2개면 질문도 2개 생성한다(1 chunk = 1 question).

## Output

chunk 개수만큼의 질문 배열을 반환한다.

```json
{
  "questions": [
    { "question": "", "cited_code": "" }
  ]
}
```

## Forbidden

* 코드에 없는 내용에 대한 질문
* "이 프로젝트에 대해 설명해주세요" 같은 지나치게 일반적인 질문

---

# 7. Ambiguity Checker Prompt

## Goal

유저 답변이 충분한 이해를 보여주는지 판단한다.

## Input

* question
* user_answer

## Thinking Rule

두 가지를 독립적으로 판단한다.

```
[judgement] 이해도 판단
1. 답변이 질문에 대한 기술적 근거(왜, 어떻게)를 포함하는가?
2. 유저가 "모른다", "복붙했다", "잘 모르겠다"고 명시했는가?
3. 답변이 지나치게 짧거나 질문과 무관한가?

[content_type] 서사 유형 판단
1. 답변이 "이런 문제가 있어서 이렇게 해결했다"는 문제→해결 서사인가?
   → PROBLEM_SOLVING
2. 답변이 "이렇게 구현했다"는 구현 소개 위주인가?
   → IMPLEMENTATION_INTRO
```

judgement와 content_type은 서로 다른 목적을 가진다. judgement는 서술 수위/방어 코멘트를, content_type은 어느 섹션(Key Implementation vs Trouble Shooting)에 들어갈지를 결정한다. 상세는 [[06_INTERVIEW_WRITER]] 3장, 10장 참고.

## Output

```json
{
  "judgement": "SUFFICIENT | AMBIGUOUS | LOW_UNDERSTANDING",
  "content_type": "PROBLEM_SOLVING | IMPLEMENTATION_INTRO",
  "follow_up_question": ""
}
```

judgement가 AMBIGUOUS일 때만 follow_up_question을 채운다.

## Forbidden

* 이미 1회 재질문한 turn에 대해 다시 AMBIGUOUS를 반환 (이 경우 LOW_UNDERSTANDING으로 강제 전환은 호출부 로직에서 처리)

---

# 8. Writer / Tone Prompt

## Goal

유저 답변을 개발자 문체로 교정하고 전체 마크다운을 재생성한다.

## Input

* question, cited_code
* user_answer
* judgement
* content_type (PROBLEM_SOLVING → Trouble Shooting 섹션, IMPLEMENTATION_INTRO → Key Implementation 섹션에 배치)
* portfolio_history (지금까지의 전체 turn)

Summary 섹션은 이 Prompt가 생성하지 않는다. Summary는 LLM 호출 없이 기존 섹션 제목을 기계적으로 나열하는 별도 로직으로 처리한다 ([[06_INTERVIEW_WRITER]] 10.2장 참고).

## Writing Rules

### 결과 중심

나쁜 예: `Redis를 사용했습니다.`

좋은 예: `조회 성능 개선을 위해 Redis 캐싱을 적용했습니다.`

### 서술 수위 규칙

```
judgement == SUFFICIENT
→ 주도적 구현/설계 관점으로 서술

judgement == LOW_UNDERSTANDING (또는 재질문 후에도 AMBIGUOUS)
→ "레퍼런스를 참고한 기능 구현 및 커스텀 적용" 수준으로 하향 서술
→ 면접 방어용 코멘트 삽입 (아래 참고)
```

### 방어 코멘트 템플릿

```
<!-- 💡 면접 대비 가이드: [해당 항목] 관련하여 면접에서 질문받을 수 있습니다.
[관련 개념]을 숙지해두는 것을 권장합니다. -->
```

### 답변에 없는 내용 생성 금지

user_answer와 portfolio_history에 없는 경험, 수치, 성과를 만들어내지 않는다.

## Forbidden Words

* 열정적인 / 도전적인
* 단순히
* ~가 아닌 ~
* 과도한 강조(**) 및 쉼표 남용

## Output

```json
{
  "portfolio_markdown": ""
}
```

전체 마크다운을 처음부터 다시 생성한다 (부분 업데이트 금지, [[06_INTERVIEW_WRITER]] 5장 참고).

---

# 9. JSON Output Rule

Question Generator, Ambiguity Checker는 유효한 JSON만 출력한다.

금지 사항

* Markdown 코드블록으로 감싸기
* JSON 앞뒤에 설명 문장 추가

Writer / Tone Prompt는 `portfolio_markdown` 필드 내부에만 마크다운을 담고, 필드 바깥은 JSON 규칙을 따른다.

---

# 10. Prompt Versioning

```yaml
prompt_version: 1.0.0
agent: question_generator
```

Prompt 변경 시 Semantic Versioning을 따른다.

---

# 11. Prompt Test Case

새 Prompt를 적용하기 전에 다음 항목을 검증한다.

* 질문이 실제로 인용된 코드에 기반하는가
* 애매성 판정이 일관적인가 (동일 답변에 동일 판정)
* 하향 서술 규칙이 적용되는가
* 방어 코멘트가 LOW_UNDERSTANDING 항목에만 삽입되는가
* 답변에 없는 내용이 생성되지 않는가
* JSON 형식 유지 여부

---

# 12. 핵심 설계 요약

Portfolio Zero-to-One Builder의 Prompt는 다음 원칙을 따른다.

* Evidence(코드 + 유저 답변) 기반 생성
* 질문의 주도권은 AI, 사실의 주도권은 유저
* 이해도에 따른 정직한 서술 수위 조정
* JSON 기반 데이터 교환, 역할별 책임 분리

Prompt는 코드와 동일한 수준으로 버전 관리하며, 프로젝트의 핵심 자산으로 유지한다.
