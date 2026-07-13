# 📄 09_DATA_SCHEMA.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

ResumeSchema, JDMetadataSchema, CandidateProjectSchema(JD 매칭용), MatchingResultSchema를 제거하고, 인터뷰 세션에 필요한 스키마(CandidateFileSchema, InterviewQuestionSchema, InterviewAnswerSchema, PortfolioDraftSchema)로 재정의했다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Portfolio Zero-to-One Builder에서 사용하는 공통 데이터 구조(Data Contract)를 정의한다.

Frontend, Backend, AI Agent, Database가 동일한 구조의 데이터를 주고받기 위한 표준 규격이다.

---

# 2. 설계 원칙

## 2.1 Single Source of Truth

동일한 데이터는 하나의 Schema만 정의한다.

## 2.2 Structured Data First

Agent 간 데이터 전달은 자연어가 아닌 JSON 기반 구조화 데이터를 사용한다.

## 2.3 Schema Versioning

```json
{
  "schema_version": "1.0.0"
}
```

---

# 3. 공통 Base Schema

```json
{
  "id": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "schema_version": "1.0.0"
}
```

---

# 4. CandidateFileSchema

Code Scanner & Scorer의 출력이다.

```json
{
  "file_path": "src/service/PaymentService.js",
  "score": 1.3,
  "score_reason": "파일 크기 점수 1.0(120줄) + 'service' 이름 패턴 보너스 0.3",
  "chunks": [
    { "code_snippet": "async function approvePayment(...) { ... }", "pattern": "try-catch" }
  ]
}
```

커밋 횟수 필드는 MVP에서 포함하지 않는다 ([[05_CODE_SCANNER_SCORER]] 3장 참고). `chunks`는 파일당 최대 2개이며, 각 chunk가 InterviewQuestionSchema 하나로 이어진다 ([[05_CODE_SCANNER_SCORER]] 7장 참고).

---

# 5. InterviewQuestionSchema

Question Generator의 출력이다.

```json
{
  "interview_id": "interview_001",
  "candidate_file_id": "file_001",
  "chunk_index": 0,
  "question": "PaymentService의 결제 승인 로직에서 try-catch로 감싼 이유를 설명해 주세요.",
  "cited_code": "try { ... } catch (e) { ... }",
  "is_follow_up": false
}
```

`chunk_index`는 `candidate_file.chunks` 배열 내 위치를 가리킨다. 한 파일에서 chunk가 2개면 질문도 2개 나오므로, `candidate_file_id`만으로는 어느 chunk에서 나온 질문인지 구분할 수 없다 ([[08_DATABASE]] 9장 참고).

---

# 6. InterviewAnswerSchema

유저 답변과 Ambiguity Checker의 판정 결과다.

```json
{
  "interview_id": "interview_001",
  "message_id": "msg_003",
  "answer": "동시성 문제 때문에 재시도 로직을 넣었어요.",
  "judgement": "AMBIGUOUS",
  "content_type": "PROBLEM_SOLVING",
  "follow_up_question": "구체적으로 어떤 동시성 문제였는지, 재시도 조건은 어떻게 설계했는지 알려주실 수 있나요?"
}
```

judgement 값 (서술 수위/방어 코멘트 결정)

* SUFFICIENT
* AMBIGUOUS (최대 1회 재질문 후 LOW_UNDERSTANDING으로 전환)
* LOW_UNDERSTANDING

content_type 값 (섹션 배치 결정, [[06_INTERVIEW_WRITER]] 3장 참고)

* PROBLEM_SOLVING → Trouble Shooting 섹션
* IMPLEMENTATION_INTRO → Key Implementation 섹션

---

# 7. PortfolioDraftSchema

Writer / Tone Agent의 출력이다. 매 턴 전체 재생성된다.

```json
{
  "session_id": "interview_001",
  "turn_number": 4,
  "markdown_content": "# Project Overview\n...\n<!-- 💡 면접 대비 가이드: ... -->\n",
  "sections": [
    {
      "title": "Trouble Shooting",
      "evidence": {
        "code_snippet": "PaymentService.js 발췌",
        "answer_message_id": "msg_003"
      },
      "confidence": "SUFFICIENT"
    }
  ]
}
```

---

# 8. AgentStateSchema

인터뷰 세션 동안 공유되는 상태 객체다.

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

`current_candidate_index`는 몇 번째 후보 파일인지, `current_chunk_index`는 그 파일의 몇 번째 chunk(질문) 차례인지를 가리킨다. 파일당 chunk가 최대 2개이므로 두 값을 함께 추적해야 다음 질문이 "같은 파일의 다음 chunk"인지 "다음 파일의 첫 chunk"인지 판단할 수 있다 ([[08_DATABASE]] 8장 참고).

모든 Agent는 필요한 필드만 읽고 자신의 결과만 갱신한다.

---

# 9. ErrorSchema

```json
{
  "error": {
    "code": "REPOSITORY_ACCESS_FAILED",
    "message": "Repository에 접근할 수 없습니다.",
    "detail": "URL을 다시 확인해주세요."
  }
}
```

---

# 10. API Response Schema

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

실패 시

```json
{
  "success": false,
  "data": null,
  "error": {}
}
```

---

# 11. 확장 규칙

새로운 필드/Agent를 추가할 경우

* 기존 Schema를 수정하기보다 확장한다.
* 기존 필드는 삭제하지 않는다.
* 새로운 필드는 Optional로 추가한다.
* Major 변경 시 `schema_version`을 증가시킨다.

---

# 12. 구현 가이드

계층 | 구현 방식
-- | --
Backend | 간단한 JS 객체 또는 필요 시 Zod Schema
Frontend | TypeScript Interface 또는 Zod Schema
AI Agent | JSON 기반 State
Database | 관계형 DB (SQLite/PostgreSQL) 또는 JSON 컬럼

---

# 13. 향후 확장 Schema

```
ResumeContextSchema (선택 입력)
JDContextSchema (선택 입력)
InterviewPrepQuestionSchema
```

---

# 14. 핵심 설계 요약

Portfolio Zero-to-One Builder의 Data Schema는 인터뷰 세션 하나가 진행되는 동안의 데이터 계약(Data Contract)이다.

모든 컴포넌트는 동일한 Schema를 기반으로 데이터를 주고받으며, 이를 통해 데이터 일관성, Agent 간 호환성, API-Frontend 타입 일치를 확보한다.
