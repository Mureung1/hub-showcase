# 📄 04_AI_AGENT_SPEC.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

기존 8개 Agent(GitHub Analyzer, Resume Analyzer, JD Analyzer, Project Retriever, Matching Agent, Story Generator, Reviewer, Portfolio Generator) 구조를 폐기하고, JD/이력서/매칭이 빠진 인터뷰 중심의 5개 Agent 구조로 재정의했다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Portfolio Zero-to-One Builder에서 사용되는 AI Agent의 역할, 책임, 데이터 흐름, 입출력 구조를 정의한다.

각 Agent는 명확한 목적을 가지고 동작하며, 이전 Agent의 결과를 입력으로 받아 다음 단계의 판단을 수행한다.

---

# 2. AI Agent 설계 원칙

## 2.1 Evidence First

모든 AI 결과는 코드 근거와 유저 답변에 기반해 생성한다. 답변에 없는 경험, 기술, 성과를 만들어서는 안 된다.

---

## 2.2 Structured Output

Agent 간 데이터 전달은 자연어가 아닌 구조화된 데이터(JSON)를 기본으로 한다.

---

## 2.3 Single Responsibility

각 Agent는 하나의 책임만 가진다.

예: Question Generator는 "질문 생성"만 수행하며 톤 교정은 수행하지 않는다.

---

## 2.4 Human Control (Question Ownership은 AI, 사실 관계는 유저)

질문의 주도권은 AI가 가지지만, 서술되는 사실은 항상 유저의 답변에서만 나온다. 최종 결과는 다운로드 전 유저가 검토할 수 있다.

---

# 3. 전체 Agent Architecture

```
                    User (GitHub URL)

                     |

                     ▼

              Code Scanner & Scorer Agent

                     |

                     ▼

            Question Generator Agent

                     |

                     ▼

                User Answer

                     |

                     ▼

             Ambiguity Checker Agent

                     |

                     ▼

            Writer / Tone Agent

                     |

                     ▼

          Portfolio Draft (Markdown)
```

---

# 4. Agent 목록

본 시스템은 총 4개의 핵심 Agent로 구성한다.

Agent | 역할
-- | --
Code Scanner & Scorer | 소스 파일 필터링 및 단순 가중치 스코어링
Question Generator | 코드 인용 기반 핀포인트 질문 생성
Ambiguity Checker | 유저 답변의 이해도 판단 및 재질문 결정
Writer / Tone Agent | 답변 문체 교정, 서술 수위 조정, 방어 코멘트 삽입, 마크다운 재생성

---

# 5. Code Scanner & Scorer Agent

## 목적

GitHub Repository의 소스 파일을 필터링하고 단순 가중치로 점수를 매겨 인터뷰 후보 파일을 선정한다.

## Input

```json
{
  "repository_url": ""
}
```

## 처리 방식

* 소스 코드 확장자만 추출 (config/문서 파일 제외)
* 파일 크기 + 이름 패턴(예: service, controller 등) 기반 단순 스코어링
* 커밋 횟수는 제외 (이유는 [[05_CODE_SCANNER_SCORER]] 참고)

## Output

```json
{
  "candidates": [
    {
      "file_path": "",
      "score": 0.0,
      "reason": "",
      "chunks": [
        { "code_snippet": "", "pattern": "" }
      ]
    }
  ]
}
```

상위 3~5개 파일을 점수 내림차순으로 선정하고, 인터뷰도 이 순서대로 진행한다. 파일당 chunk는 최대 2개까지만 추출한다. 스코어링 수치 기준, chunk 추출 방식은 [[05_CODE_SCANNER_SCORER]] 6~7장 참고.

---

# 6. Question Generator Agent

## 목적

점수가 높은 후보 파일의 원본 코드를 인용해 구체적인 질문을 생성한다. chunk 하나당 질문 하나를 생성하므로, 파일 하나에서 여러 패턴이 감지되면 질문도 여러 개 나온다.

## Input

```json
{
  "file_path": "",
  "chunks": [
    { "code_snippet": "", "pattern": "" }
  ]
}
```

## Thinking Rule

각 chunk의 코드 내 특정 패턴(예외 처리, 비동기 처리, 상태 관리, 성능 최적화 등)을 감지하면 해당 부분을 인용해 질문한다.

## Output

```json
{
  "questions": [
    { "question": "", "cited_code": "" }
  ]
}
```

## Forbidden

* 코드에 없는 내용에 대한 질문 생성
* 지나치게 일반적인 질문 ("이 프로젝트에 대해 설명해주세요" 등)

---

# 7. Ambiguity Checker Agent

## 목적

유저 답변이 충분한 이해를 보여주는지(judgement), 그리고 문제→해결 서사인지 구현 소개인지(content_type)를 함께 판단한다. 전자는 서술 수위/방어 코멘트를, 후자는 어느 섹션에 들어갈지를 결정한다 (역할 분리 이유는 [[06_INTERVIEW_WRITER]] 3장 참고).

## Input

```json
{
  "question": "",
  "user_answer": ""
}
```

## Output

```json
{
  "judgement": "SUFFICIENT | AMBIGUOUS | LOW_UNDERSTANDING",
  "content_type": "PROBLEM_SOLVING | IMPLEMENTATION_INTRO",
  "follow_up_question": ""
}
```

## 판단 규칙 (judgement)

```
SUFFICIENT → Writer / Tone Agent로 진행

AMBIGUOUS → follow_up_question 생성, 최대 1회만 재질문

LOW_UNDERSTANDING (유저가 "모른다"/"복붙했다" 등 명시) → 재질문 없이 진행, Writer Agent에 하향 조정 지시
```

재질문 1회 이후에도 AMBIGUOUS이면 LOW_UNDERSTANDING으로 간주하고 진행한다.

---

# 8. Writer / Tone Agent

## 목적

유저 답변을 개발자 문체로 교정하고, 이해도에 따라 서술 수위를 조정하며, 필요 시 면접 방어용 코멘트를 삽입해 전체 마크다운을 재생성한다.

## Input

```json
{
  "question": "",
  "user_answer": "",
  "judgement": "SUFFICIENT | AMBIGUOUS | LOW_UNDERSTANDING",
  "content_type": "PROBLEM_SOLVING | IMPLEMENTATION_INTRO",
  "portfolio_history": []
}
```

## 섹션 배치 규칙

```
content_type == IMPLEMENTATION_INTRO → Key Implementation 섹션에 배치

content_type == PROBLEM_SOLVING → Trouble Shooting 섹션에 배치
```

## 서술 수위 규칙 (배치된 섹션 내부에서 적용)

```
SUFFICIENT → 주도적 구현/설계 관점으로 서술

LOW_UNDERSTANDING → "오픈소스 레퍼런스를 참고한 기능 구현 및 커스텀 적용" 수준으로 하향 서술
```

## 방어 코멘트 규칙

LOW_UNDERSTANDING 판정 항목에는 다음과 같은 코멘트를 마크다운 내 삽입한다.

```
<!-- 💡 면접 대비 가이드: 이 부분은 복붙/레퍼런스 기반이라고 답변하셨습니다.
면접에서 질문받을 수 있으니 관련 개념을 숙지해두세요. -->
```

## Output

```json
{
  "portfolio_markdown": ""
}
```

전체 마크다운을 매 턴 처음부터 다시 생성한다(부분 업데이트 아님). 이유는 [[06_INTERVIEW_WRITER]] 참고.

Summary 섹션은 이 Agent가 생성하지 않는다. Summary는 LLM 호출 없이 지금까지 쌓인 섹션 제목을 기계적으로 나열하는 별도 로직이다 ([[06_INTERVIEW_WRITER]] 10.2장 참고).

---

# 9. Agent State 관리

```json
{
  "session_id": "",
  "candidate_files": [],
  "current_candidate_index": 0,
  "current_chunk_index": 0,
  "interview_history": [],
  "portfolio_markdown": ""
}
```

`current_chunk_index`는 파일당 chunk가 최대 2개일 수 있어 필요한 값이다. 그 파일의 마지막 chunk를 넘어서면 `current_candidate_index`를 다음 파일로 올리고 `current_chunk_index`를 0으로 리셋한다 ([[08_DATABASE]] 8장 참고).

---

# 10. Error Handling

## Agent 실패

```
Retry

↓

Fallback

↓

User Notification
```

## 후보 파일 부족

분석 가능한 소스 파일이 부족하면 인터뷰를 진행하지 않고 사용자에게 안내한다.

---

# 11. MVP Agent 범위

## Phase 1 (필수)

```
Code Scanner & Scorer
Question Generator
Ambiguity Checker
Writer / Tone Agent
```

## Phase 2 (고도화)

```
스코어링 알고리즘 고도화 (AST, Git Diff 시맨틱)
스트리밍 응답 지원
섹션 단위 부분 업데이트
프로젝트 레벨 동기 오프닝 질문 (README에 없을 경우 보완, [[05_CODE_SCANNER_SCORER]] 12장 참고)
```

---

# 12. 향후 확장 Agent

```
Resume Interview Agent
JD Alignment Agent (선택 입력 기반)
Interview Prep Agent
Career Advisor Agent
```

---

# 13. 최종 AI Pipeline

```
GitHub URL

↓

Code Scanner & Scorer

↓

Question Generator

↓

User Answer

↓

Ambiguity Checker

↓

Writer / Tone Agent

↓

Portfolio Draft

↓

(반복)

↓

Output (Markdown)
```

---

# 14. 핵심 목표

Portfolio Zero-to-One Builder의 AI 시스템은 유저의 코드를 근거로 질문의 주도권을 가져가고, 유저의 실제 답변만을 근거로 신뢰할 수 있는 포트폴리오 초안을 완성하는 인터뷰 기반 Agent를 목표로 한다.
