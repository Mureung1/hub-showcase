# Decision Log 도메인 정책

> 도메인 객체의 상태, 전이, 규칙의 단일 기준 문서다.
> 용어 정의는 `docs/product.md`, 테이블·제약·RLS는 `docs/data-model.md`를 따른다.
> 각 Spec은 이 문서의 정책을 구체화하며, 충돌이 있으면 임의로 결정하지 말고 보고한다.
> 미확정 예외 정책은 `docs/status.md`의 미결정 사항을 따른다.

---

## 1. Chat 정책

### 1.1 대화형 Context

같은 Chat의 다음 Question은 이전 `completed` Question의 확정 결과를 Context로 사용한다.

Context 구성 규칙은 다음과 같다.

```text
직전 completed Question
→ 해당 Question의 FinalAnswer 사용

직전보다 오래된 completed Question
→ 각 Question의 DecisionNote 사용
```

예를 들어 Question 4를 실행한다면 다음 Context를 구성한다.

```text
Question 3
→ Question 3의 FinalAnswer

Question 1, Question 2
→ Question 1과 Question 2의 DecisionNote
```

각 Context 항목에는 내용의 의미를 식별할 수 있도록 원본 Question 메시지와 Question ID를 함께 포함한다.

다음 내용은 Context에서 제외한다.

```text
처리 중인 Question
failed 또는 제외된 SourceAnswer
rejected Agenda의 세부 내용
SourceAnswer 원문 전체
내부 오류 메시지
```

### 1.2 Context Snapshot

Question 실행 시 실제로 AI에게 전달한 이전 대화 Context를 Snapshot으로 저장한다.

```text
questions.context_snapshot
questions.context_version
```

Snapshot은 당시 실행을 재현하기 위한 기록이므로 생성 후 수정하지 않는다.

예:

```json
{
  "immediatePrevious": {
    "questionId": "question-3",
    "sequenceNumber": 3,
    "question": "백엔드 인증은 어떻게 처리할까?",
    "finalAnswer": "Supabase JWT를 Express에서 검증한다."
  },
  "decisionHistory": [
    {
      "questionId": "question-1",
      "sequenceNumber": 1,
      "question": "Supabase를 언제 도입해야 할까?",
      "decisionNote": "3주차부터 Supabase를 연결한다."
    },
    {
      "questionId": "question-2",
      "sequenceNumber": 2,
      "question": "저장 Adapter는 어떻게 만들까?",
      "decisionNote": "처음부터 Promise 기반으로 작성한다."
    }
  ]
}
```

실제 Prompt에 포함할 Question 범위와 Token 제한은 AI Prompt Spec에서 별도로 정의한다.

### 1.3 한 번에 하나의 Question만 처리

같은 Chat에서는 미완료 Question을 동시에 두 개 이상 생성할 수 없다.

다음 상태의 Question이 존재하면 새로운 Question 생성을 막는다.

```text
draft
processing
review_required
```

현재 Question이 `completed`가 된 뒤에만 다음 Question을 생성할 수 있다.

이 규칙은 프론트엔드 버튼 비활성화뿐 아니라 Express Service와 DB 제약에서도 검증한다.


---

## 2. Question 정책

### 2.1 Question 상태

Question 상태는 전체 질문 처리 단계만 나타낸다.

| 상태 | 정의 | 다음 행동 |
|---|---|---|
| `draft` | 사용자가 질문을 작성 중이며 아직 실행하지 않은 상태 | 질문을 수정하거나 실행한다 |
| `processing` | SourceAnswer 생성 또는 Manager AI의 Agenda 비교가 진행 중인 상태 | AI 처리 결과를 기다리거나 실패한 SourceAnswer를 재시도한다 |
| `review_required` | Agenda 판단 또는 재검토 결과 확인 등 사용자의 후속 행동을 기다리는 상태 | Agenda를 처리한다 |
| `completed` | 모든 Agenda가 최종 상태이고 FinalAnswer와 DecisionNote가 모두 생성된 상태 | 다음 Question 입력을 활성화한다 |

### 2.2 Question 상태 전이

정상 흐름:

```text
draft
→ 사용자가 질문 실행
→ processing
```

모든 Agenda가 자동 통과한 경우:

```text
processing
→ 모든 Agenda가 passed
→ FinalAnswer 생성
→ DecisionNote 자동 생성·저장
→ completed
```

Conflict Agenda가 하나 이상 있는 경우:

```text
processing
→ review_required
```

사용자 판단이 모두 완료된 경우:

```text
review_required
→ 모든 Agenda가 passed 또는 rejected
→ FinalAnswer 생성
→ DecisionNote 자동 생성·저장
→ completed
```

Agenda 재검토가 진행 중이거나 재검토 결과를 기다리는 동안 Question은 `review_required`를 유지한다.

### 2.3 SourceAnswer 실패 시 Question 처리

SourceAnswer가 처음 `failed` 상태가 되면 해당 Provider 요청을 한 번만 재시도한다.

```text
첫 번째 실패
→ retry_count = 1
→ 같은 SourceAnswer를 다시 processing으로 변경
→ Provider 재호출
```

재시도 후에도 실패하면 해당 SourceAnswer는 비교 대상에서 제외한다.

```text
두 번째 실패
→ status = failed
→ excluded_from_comparison = true
→ excluded_at 기록
```

이후 정책:

- 하나 이상의 SourceAnswer가 `succeeded`라면 성공한 답변만 사용하여 처리를 계속한다.
- 실패 후 제외된 SourceAnswer는 Manager AI 입력과 FinalAnswer 생성 근거에서 제외한다.
- UI에는 일부 AI 답변이 제외되었다는 안내를 표시한다.
- Question은 별도의 `failed` 상태를 사용하지 않고 `processing`을 유지한다.
- 모든 SourceAnswer가 최종 실패한 경우의 종료 메시지는 별도 예외 정책으로 확정해야 한다.

Question에는 최근 오류를 보조 필드로 저장할 수 있다.

```text
last_error_code
last_error_message
```


---

## 3. SourceAnswer 정책

### 3.1 SourceAnswer 상태

| 상태 | 정의 | 다음 행동 |
|---|---|---|
| `pending` | 레코드는 생성되었지만 Provider 요청을 시작하지 않은 상태 | Provider 요청을 시작한다 |
| `processing` | Provider에 요청을 보내고 응답을 기다리는 상태 | 응답을 기다린다 |
| `succeeded` | 응답 수신과 Zod 구조 검증에 성공한 상태 | Manager AI 비교에 사용한다 |
| `failed` | 요청 실패, 시간 초과 또는 Zod 검증 실패 상태 | 오류를 표시하고 재시도한다 |

정상 흐름:

```text
pending
→ processing
→ succeeded
```

실패 흐름:

```text
pending
→ processing
→ failed
```

### 3.2 SourceAnswer 저장 원칙

SourceAnswer에 Question의 메시지를 중복 저장하지 않는다.

```text
source_answers.question_id
→ questions.message 조회
```

재현과 감사에 필요한 실행 정보는 별도로 저장한다.

```text
prompt_version
request_snapshot
raw_content
structured_content
```

- `request_snapshot`: 실제 Provider에 전달한 요청의 안전한 Snapshot
- `raw_content`: Provider가 반환한 원문
- `structured_content`: 공통 Zod Schema로 검증한 구조화 응답
- API Key나 비밀 정보는 Snapshot에 저장하지 않는다.

MVP에서는 Question과 Provider 조합당 SourceAnswer 하나를 사용한다.

- 최초 요청의 `retry_count`는 `0`이다.
- 첫 실패 후 재시도할 때 `retry_count`를 `1`로 변경한다.
- 재시도 후에도 실패하면 `excluded_from_comparison = true`로 변경한다.
- 추가 재시도는 허용하지 않는다.
- 재시도 시 같은 레코드의 상태와 결과를 갱신한다.


---

## 4. Agenda 정책

### 4.1 Agenda 상태

Agenda는 하나의 단방향 상태 머신을 사용한다.

| 상태 | 정의 | 다음 행동 |
|---|---|---|
| `draft` | Manager AI가 Agenda를 생성했지만 비교 판정이 완료되지 않은 상태 | SourceAnswer 내용을 비교한다 |
| `conflicted` | Manager AI가 AI별 내용 간 충돌을 발견한 상태 | 사용자가 채택·제외·재검토 중 하나를 선택한다 |
| `recheck_requested` | 사용자가 해당 Agenda에 1회 재검토를 요청한 상태 | Manager AI가 다시 검토한다 |
| `reanswered` | Manager AI의 재검토 결과가 도착한 상태 | 사용자가 채택 또는 제외를 최종 선택한다 |
| `passed` | Consensus이거나 사용자가 채택한 최종 상태 | FinalAnswer 생성에 포함한다 |
| `rejected` | 사용자가 최종 답변에서 제외한 상태 | FinalAnswer 생성에서 제외한다 |

### 4.2 Agenda 상태 전이

Manager AI 비교 결과 Consensus인 경우:

```text
draft
→ Manager AI가 합의 내용을 selected_content에 저장
→ passed
```

Consensus로 자동 통과한 Agenda도 `selected_content`를 반드시 가진다.

Manager AI 비교 결과 Conflict인 경우:

```text
draft
→ conflicted
```

Conflict 상태에서 사용자는 다음 중 하나를 선택한다.

```text
conflicted
├── 기존 AI 내용 채택 → passed
├── 사용자 채택 내용 직접 입력 → passed
├── 제외 → rejected
└── 재검토 → recheck_requested
```

사용자가 직접 입력한 채택 내용은 `selected_content`에 저장한다.

재검토 흐름:

```text
recheck_requested
→ Manager AI 재검토
→ reanswered
```

재검토 호출이 실패하면 상태를 되돌리지 않고 `recheck_requested`를 유지한다. 이 상태에서 사용자는 네 가지 중 하나를 선택할 수 있다 (SPEC-AI-002 결정 10·11).

```text
recheck_requested
├── 다시 시도 → recheck_requested 유지
├── 기존 AI 내용 채택 → passed
├── 사용자 채택 내용 직접 입력 → passed
└── 제외 → rejected
```

`recheck_requested`에서 채택·제외로 빠져나간 경우에는 재검토 결과를 본 적이 없으므로 `resolution_reason`에 `_after_recheck` 접미사를 붙이지 않는다.

재검토 결과 확인 후:

```text
reanswered
├── 재검토 결과 또는 기존 AI 내용 채택 → passed
├── 사용자 채택 내용 직접 입력 → passed
└── 제외 → rejected
```

사용자가 직접 입력한 채택 내용은 `selected_content`에 저장한다.

`reanswered` 상태에서는 재검토를 다시 요청할 수 없다.

### 4.3 재검토 제한

Agenda별 재검토는 최대 1회만 허용한다.

**1회 제한은 사용자의 요청 횟수가 아니라 성공한 재검토 횟수로 센다** (SPEC-AI-002 결정 10).

- 프론트엔드는 `conflicted` 상태에서 재검토 버튼을, `recheck_requested` 상태에서 [다시 시도] 버튼을 표시한다.
- Express Service는 `conflicted`에서 새 재검토 요청을, `recheck_requested`에서 실패한 호출의 재시도를 허용한다.
- **성공한 재검토가 한 번 끝난 뒤**(`reanswered`) 또는 최종 상태(`passed`·`rejected`)에서는 재검토를 거절한다.
- 거절은 `409 Conflict`로 처리할 수 있다.

### 4.4 Resolution Reason

Agenda 상태는 한 축으로 유지하되, 최종 상태가 된 이유를 `resolution_reason`으로 보존한다.

| 값 | 의미 |
|---|---|
| `auto_consensus` | Manager AI가 Consensus로 판단하여 자동 Passed 처리 |
| `auto_single_source` | 하나의 Provider만 언급한 쟁점이라 비교 없이 자동 Passed 처리. **합의가 아니므로 `auto_consensus`를 쓰지 않는다** |
| `user_accepted` | Conflict 상태에서 사용자가 채택 |
| `user_accepted_after_recheck` | 재검토 결과 또는 기존 AI 내용을 사용자가 채택 |
| `user_composed` | Conflict 상태에서 사용자가 채택 내용을 직접 입력 |
| `user_composed_after_recheck` | 재검토 이후 사용자가 채택 내용을 직접 입력 |
| `user_rejected` | Conflict 상태에서 사용자가 제외 |
| `user_rejected_after_recheck` | 재검토 결과 확인 후 사용자가 제외 |

`draft`, `conflicted`, `recheck_requested`, `reanswered` 상태에서는 `resolution_reason`이 `null`이다.

### 4.5 Agenda 근거 추적

MVP에서는 SourceAnswer의 구조화 응답과 Agenda 근거를 JSONB로 저장한다.

```text
source_answers.structured_content
agendas.source_refs
```

`source_refs` 예:

```json
[
  {
    "sourceAnswerId": "answer-1",
    "sectionId": "section-2"
  },
  {
    "sourceAnswerId": "answer-2",
    "sectionId": "section-3"
  }
]
```

이는 어떤 AI의 어떤 Section이 Agenda의 근거였는지 확인하기 위한 최소 구조다.

`source_refs`의 `sectionId`가 성립하도록, `structured_content`의 Zod Schema는 각 Section에 안정적인 `sectionId` 필수 필드를 포함해야 한다. 이 요구사항은 Zod Schema Spec에 반영한다.

고도화 단계에서는 다음 테이블로 정규화할 수 있다.

```text
answer_sections
agenda_sources
```


---

## 5. FinalAnswer 정책

### 5.1 생성 조건

Question에 속한 모든 Agenda가 다음 최종 상태 중 하나가 되면 FinalAnswer 생성을 시작한다.

```text
passed
rejected
```

Passed Agenda가 하나 이상이면 다음 데이터를 사용해 Manager AI가 FinalAnswer를 한 번 생성한다.

```text
passed Agenda의 제목
passed Agenda의 요약
passed Agenda의 selected_content
passed Agenda의 근거
rejected Agenda의 제외 사실
```

### 5.2 모든 Agenda가 Rejected인 경우

모든 Agenda가 `rejected`라면 Manager AI를 호출하지 않고 다음 고정 문구를 FinalAnswer로 저장한다.

```text
모든 Agenda가 충돌하였습니다. 다시 질문 부탁드립니다.
```

이 경우 `generation_mode = all_agendas_rejected`로 기록한다.

### 5.3 단일 SourceAnswer Fallback

SourceAnswer 재시도 정책에 따라 하나의 Provider만 성공한 경우, 성공한 SourceAnswer만 사용해 답변 생성을 계속한다.

이 경우 다중 AI 합의로 표현하지 않으며, FinalAnswer에 일부 AI 답변이 제외되었다는 사실을 표시한다.

```text
generation_mode = single_source_fallback
```

두 개 이상의 Provider가 성공한 경우에는 `multi_source`로 생성한다. `single_source_fallback`은 정확히 하나의 Provider만 성공한 경우에만 사용한다.

단일 SourceAnswer 기반 Agenda 처리 방식과 `resolution_reason`은 **SPEC-AI-002에서 확정되었다**: 각 Section을 그대로 Agenda로 만들고 `resolution_reason = auto_single_source`로 자동 통과시킨다. 합의한 적이 없으므로 `auto_consensus`를 쓰지 않으며, 화면에서도 '합의'·'Consensus' 표현을 쓰지 않는다.

### 5.4 재생성 금지

- FinalAnswer는 Question당 한 번만 생성한다.
- 사용자 또는 Agent가 FinalAnswer를 재생성할 수 없다.
- FinalAnswer 생성 API는 기존 레코드가 있으면 중복 생성을 거절한다.
- FinalAnswer 생성 후 DecisionNote 자동 생성·저장이 완료된 뒤에만 Question을 `completed`로 변경한다.


---

## 6. DecisionNote 정책

DecisionNote는 Question의 최종 결론을 요약한 결정 기록이다.

- Question당 정확히 하나를 저장한다.
- MVP에서는 Manager AI가 FinalAnswer를 **근거로** 요약을 자동 생성해 저장한다.

> **개정 (2026-07-31, SPEC-AI-003 결정 2)**: 초판은 "FinalAnswer 확정 **직후**"였다. SPEC-AI-003이 FinalAnswer와 DecisionNote를 **한 번의 AI 호출**로 받기로 하면서 "직후"를 완화한다. "**근거로**"는 그대로 지켜진다 — 출력 스키마에서 `finalAnswer`가 앞에 오므로 모델은 자기가 방금 쓴 글을 요약한다. 오히려 별도 호출보다 일관성이 높다.
> 근거: 충돌 0건 경로에서는 사용자 판단 없이 대기가 이어지므로 호출 1회를 아끼는 것이 체감에 직접 작용한다.
- 모든 Agenda가 `rejected`인 경우에는 고정 문구 FinalAnswer를 그대로 DecisionNote로 저장하고 Question을 완료 처리한다.
- 사용자 편집·수정·삭제 기능은 MVP에서 제공하지 않는다.
- 사용자 입력 기반 작성·수정 기능은 후속 버전에서 추가한다.
- DecisionNote는 Chat과 Question을 동시에 참조하지 않는다.
- `question_id`만 저장하며 Chat은 Question을 통해 조회한다.
- FinalAnswer만 생성되고 DecisionNote 자동 저장이 끝나지 않은 상태에서는 Question을 완료 처리하지 않는다.
- DecisionNote 저장 성공 후 Question을 `completed`로 변경하고 `completed_at`을 기록한다.
- 다음 Question은 DecisionNote 저장이 끝난 뒤에만 생성할 수 있다.


---

## 7. 삭제 및 보관 정책

MVP에서는 Chat 삭제와 보관 기능을 제공하지 않는다.

- Chat 삭제 API와 UI를 만들지 않는다.
- `is_active`, `deleted_at`, `archived_at` 필드를 추가하지 않는다.
- Question, SourceAnswer, Agenda, FinalAnswer, DecisionNote의 사용자 삭제 기능도 이번 MVP 범위에서 제외한다.
- 사용자 계정 삭제 시 데이터 처리 정책은 후속 정책으로 분리한다.
- 계정 삭제 정책이 확정되기 전까지 `chats.user_id`는 `ON DELETE RESTRICT`로 두어, `auth.users` 삭제가 서비스 데이터 자동 삭제로 이어지지 않게 한다.


---

## 8. 확정된 추가 정책

1. 모든 Agenda가 `rejected`라면 다음 문구를 FinalAnswer로 저장한다.

```text
모든 Agenda가 충돌하였습니다. 다시 질문 부탁드립니다.
```

2. SourceAnswer는 실패 시 한 번만 재시도한다. 재시도 후에도 실패하면 비교에서 제외하고 성공한 SourceAnswer만으로 처리를 계속한다.
3. Question은 FinalAnswer와 DecisionNote가 모두 생성되어야 `completed`가 된다.
4. 다음 Question Context는 직전 Question의 FinalAnswer와 그보다 이전 Question들의 DecisionNote로 구성한다.
   - DecisionNote는 **최근 N개까지만** 포함한다(기본 5, 설정값). 컨텍스트가 무한히 자라면 3사 호출 입력이 비대해진다.
   - 상한에 걸려 생략된 건수를 `questions.context_snapshot`에 기록한다. **조용히 자르지 않는다.**
   - 구성 규칙이 바뀌면 `context_version`을 올린다. (SPEC-AI-003 §7)
5. Chat 삭제 기능은 제공하지 않는다.
6. FinalAnswer는 Question당 한 번만 생성하며 재생성을 허용하지 않는다.
7. `conflicted`와 `reanswered` 상태에서 사용자는 채택 내용을 직접 입력할 수 있다. 직접 입력한 내용은 `selected_content`에 저장하고 Agenda를 `passed`로 변경한다.
8. Supabase 이메일 인증 완료를 서비스 이용의 필수 조건으로 한다.
9. Consensus로 자동 통과한 Agenda도 Manager AI가 합의 내용을 `selected_content`에 저장한다. `passed → selected_content NOT NULL` 제약을 유지한다.
10. 조회와 사용자 행동은 사용자 JWT Client(RLS 적용)로 처리하고, AI 파이프라인의 시스템 쓰기는 Secret Key Client + Service 계층의 소유권 검증으로 처리한다.
11. `chats.user_id`는 `ON DELETE RESTRICT`로 설정한다.
12. MVP AI Provider는 Claude, OpenAI, Gemini 세 개로 한다.
13. Chat `title`은 첫 Question message의 앞 100자를 사용하며, 수정 기능은 제공하지 않는다.
14. `updated_at`은 PostgreSQL Trigger로 자동 갱신한다.
15. DecisionNote는 저장 후 수정·삭제 기능을 제공하지 않는다.
16. MVP의 DecisionNote는 FinalAnswer 확정 직후 자동 요약으로 생성·저장한다. 사용자 편집 기능은 후속 버전에서 추가한다.
