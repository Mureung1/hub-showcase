# 📄 11_INTERVIEW_ORCHESTRATOR.md

# Portfolio Zero-to-One Builder

---

# 0. 문서 성격

본 문서는 MVP 범위 밖의 **Phase 2 확장 설계**다. [[01_PRD]] 8장(MVP 범위)과 [[04_AI_AGENT_SPEC]] 11장(Phase 1 필수 Agent)에서 의도적으로 좁혀놓은 "정해진 후보 파일/chunk 순서 + 최대 1회 재질문" 구조를 전제로 MVP가 먼저 완성되고 핵심 가설(코드 근거 질문이 실제로 쓸만한가)이 검증된 이후에만 착수하는 것을 전제로 작성한다. 기존 문서(01~10번)는 이 문서 도입과 무관하게 그대로 유효하며, 본 문서는 그 위에 얹는 확장 레이어만 정의한다.

---

# 1. 배경 (왜 필요한가)

MVP 구조는 `current_candidate_index`/`current_chunk_index`([[08_DATABASE]] 8장)로 다음 질문을 기계적으로 결정한다. Ambiguity Checker가 애매함을 판단해도 재질문은 최대 1회로 제한되고([[04_AI_AGENT_SPEC]] 7장), 그 이상은 무조건 다음 chunk/파일로 넘어간다.

실사용 단계에서 다음과 같은 니즈가 확인되면 이 제약이 답답하게 느껴질 수 있다.

```
유저가 한 chunk에 대해 흥미로운 이야기를 더 하고 싶어 하는데
시스템이 강제로 다음 파일로 넘겨버리는 경우

↓

유저의 답변이 다른 파일/다른 흥미로운 코드 영역을 암시하는데
시스템은 정해진 순서만 따라가느라 그 힌트를 못 알아채는 경우
```

이를 해결하려면 "다음에 무엇을 물을지"를 인덱스 증가가 아니라 **대화 맥락을 보는 LLM 판단**으로 대체해야 한다.

---

# 2. 설계 원칙

## 2.1 MVP 검증 선행

이 확장은 MVP가 실제로 동작하고 핵심 가설이 검증된 이후에만 도입한다. 검증 전에 도입하면 "질문이 쓸만한가"와 "자유도 통제가 되는가"라는 두 개의 검증되지 않은 문제를 동시에 떠안게 된다.

## 2.2 Evidence First 원칙 유지

자유도가 올라가도 [[04_AI_AGENT_SPEC]] 2.1장의 Evidence First 원칙(코드 근거 없는 질문 금지)은 그대로 적용된다. 오케스트레이터가 새로운 주제로 이동하기로 판단해도, 그 주제는 반드시 후보 파일 풀 안에 존재하는 코드에 근거해야 하며 코드에 없는 내용을 상상해서 질문하지 않는다.

## 2.3 유한성 보장

자유도가 높아진 대신, 인터뷰가 무한히 늘어지지 않도록 시스템이 명시적인 종료 조건을 가진다(6장 참고).

## 2.4 기존 자산 재사용

`InterviewMessage` 히스토리, `portfolio_markdown` 재생성 로직, Candidate File/chunk 풀 자체는 재설계하지 않고 그대로 재사용한다. 바뀌는 것은 "다음에 뭘 할지 결정하는 방식"뿐이다.

---

# 3. 기존 구조와의 차이

```
[MVP]
current_chunk_index++  (기계적 순번 이동)
   ↓
정해진 다음 chunk의 고정 질문(또는 최대 1회 재질문)

[확장 이후]
Interview Router Agent가 대화 히스토리 + 남은 chunk 풀을 보고
"다음 행동(action)"을 직접 결정
   ↓
결정된 action에 따라 Question Generator가 질문 생성
```

---

# 4. Interview Router Agent (신규)

## 목적

지금까지의 인터뷰 히스토리와 아직 다루지 않은 candidate chunk 풀을 보고, 다음에 어떤 행동을 취할지 결정한다. Question Generator, Ambiguity Checker, Writer/Tone Agent는 역할이 바뀌지 않으며, 이 Agent가 그 앞단에 라우팅 역할로 추가된다.

## Input

```json
{
  "interview_history": [],
  "remaining_chunks": [
    { "file_path": "", "chunk_index": 0, "code_snippet": "", "pattern": "" }
  ],
  "current_file_path": "",
  "current_chunk_index": 0,
  "turns_used": 0,
  "max_turns": 0
}
```

## Thinking Rule

```
1. 유저의 마지막 답변이 현재 chunk에 대해 더 파고들 만한 여지를 남겼는가?
   → 있으면 CONTINUE_CHUNK

2. 현재 chunk에 대한 대화가 충분히 마무리됐는가?
   → 같은 파일에 남은 chunk가 있으면 NEXT_CHUNK
   → 없으면 NEXT_FILE

3. 유저의 답변이 remaining_chunks 중 아직 다루지 않은 다른 파일/chunk의
   코드 내용을 암시했는가? (예: 다른 모듈과의 연동 언급)
   → 있으면 NEW_TOPIC (반드시 remaining_chunks 중 하나를 근거로 지정, 근거 없는
     이동 금지)

4. remaining_chunks가 소진됐거나 turns_used가 max_turns에 도달했는가?
   → END
```

## Output

```json
{
  "action": "CONTINUE_CHUNK | NEXT_CHUNK | NEXT_FILE | NEW_TOPIC | END",
  "target_chunk": { "file_path": "", "chunk_index": 0 },
  "reason": ""
}
```

`action`이 `NEW_TOPIC`일 때 `target_chunk`는 반드시 `remaining_chunks` 안에 실제로 존재하는 항목이어야 한다(6.2장 검증 규칙 참고).

## Forbidden

* `remaining_chunks`에 없는 임의의 코드/파일을 `target_chunk`로 지정
* `turns_used >= max_turns`인데 `END`가 아닌 다른 action 반환
* 근거(유저 답변의 암시) 없이 `NEW_TOPIC` 반환

---

# 5. 전체 Pipeline (확장 이후)

```
                User (GitHub URL)

                     |
                     ▼
          Code Scanner & Scorer Agent
       (변경 없음 — candidate 풀 생성)

                     |
                     ▼
            Question Generator Agent
                (chunk 하나 지정받아 질문 생성, 역할 변경 없음)

                     |
                     ▼
                User Answer

                     |
                     ▼
             Ambiguity Checker Agent
                (역할 변경 없음)

                     |
                     ▼
            Writer / Tone Agent
                (역할 변경 없음)

                     |
                     ▼
          Interview Router Agent (신규)
   (히스토리 + remaining_chunks 보고 다음 action 결정)

                     |
                     ▼
      CONTINUE_CHUNK / NEXT_CHUNK / NEXT_FILE / NEW_TOPIC / END
```

Router Agent는 Writer/Tone Agent 이후, 다음 질문을 만들기 직전에 호출된다. 기존 4개 Agent의 입출력 계약은 바뀌지 않는다.

---

# 6. 유한성 보장 정책

## 6.1 하드 리밋

```
max_turns (세션 전체 최대 턴 수)         — 기본값 예: 후보 파일 수 × 3
max_turns_per_chunk (같은 chunk 반복 한도) — 기본값 예: 2
```

`turns_used`가 `max_turns`에 도달하면 Router Agent의 판단과 무관하게 시스템이 강제로 `END` 처리한다. 같은 chunk에 대한 `CONTINUE_CHUNK`가 `max_turns_per_chunk`를 넘으면 `NEXT_CHUNK`/`NEXT_FILE`로 강제 전환한다.

## 6.2 NEW_TOPIC 검증 규칙

Router Agent가 `NEW_TOPIC`을 반환해도, 호출부(서버 로직)가 `target_chunk`가 실제 `remaining_chunks` 목록에 존재하는지 재검증한다. 목록에 없으면 LLM의 판단을 무시하고 `NEXT_FILE`로 대체한다(Evidence First 원칙을 코드 레벨에서 한 번 더 강제).

---

# 7. 데이터 모델 변경

[[08_DATABASE]] 8~9장의 `InterviewSession`/`InterviewMessage` 스키마는 큰 변경 없이 필드만 추가한다.

## InterviewSession 추가 필드

```
turns_used              (현재까지 사용한 턴 수)
max_turns               (세션 시작 시 candidate 개수 기반으로 계산해 고정)
visited_chunks          (이미 질문한 chunk 목록 — file_path + chunk_index 조합)
```

`current_candidate_index`/`current_chunk_index`는 "현재 다루고 있는 chunk가 무엇인지"를 가리키는 용도로는 계속 쓰이지만, "다음 챤크를 기계적으로 결정하는 값"으로서의 역할은 사라지고 Router Agent의 `target_chunk` 결과로 갱신되는 값으로 의미가 바뀐다.

## InterviewMessage 추가 필드

```
router_action     (해당 턴 종료 후 Router Agent가 내린 action)
router_reason     (판단 근거, 로그/디버깅용)
```

## 관계

기존 ERD([[08_DATABASE]] 3장) 구조는 변경되지 않는다. `InterviewSession`이 위 필드를 추가로 갖는 것뿐이다.

---

# 8. API 변경

[[07_API_SPEC]]의 엔드포인트 목록과 요청/응답 필드는 그대로 유지한다. `POST /interviews/{id}/messages` 응답의 `next_question`/`next_cited_code`는 지금처럼 "다음에 보여줄 질문"만 담으면 되고, 그 뒤에서 어떤 action으로 결정됐는지는 클라이언트가 알 필요가 없다(내부 구현 세부사항).

다만 디버깅/투명성을 위해 응답에 선택 필드를 추가할 수 있다.

```json
{
  "router_action": "CONTINUE_CHUNK | NEXT_CHUNK | NEXT_FILE | NEW_TOPIC | END"
}
```

이 필드는 필수가 아니며, 프론트에서 진행 상황 표시(예: "다른 파일로 넘어갈게요") 등에 선택적으로 활용할 수 있다.

---

# 9. 도입 전제 조건

```
1. MVP(4개 Agent 전체 실제 LLM 연동) 완료 및 실사용 검증
2. "질문이 코드에 대해 실제로 궁금한 것처럼 느껴지는가"라는
   핵심 가설이 긍정적으로 확인됨
3. 재질문 1회 제한이 실사용 중 실제로 답답하다는 피드백이
   반복적으로 확인됨
```

세 조건 중 하나라도 충족되지 않으면 이 확장보다 MVP 품질(프롬프트 다듬기, 에러 핸들링, DB 이전 등)을 우선한다.

---

# 10. 리스크

## 10.1 근거 없는 질문으로 이탈

자유도가 높아질수록 "코드와 무관한 일반 잡담형 질문"으로 흐를 위험이 커진다. 6.2장의 코드 레벨 재검증으로 완화하되, 완전히 제거되지는 않는다.

## 10.2 인터뷰가 과도하게 길어짐

유저가 계속 애매하게 답하면 Router Agent가 `CONTINUE_CHUNK`를 반복 선택할 수 있다. 6.1장의 하드 리밋으로 강제 종료하되, 유저 경험상 "질문이 끝나지 않는다"는 인상을 줄 수 있어 프론트에 진행률 표시(예: "N/max_turns") 도입을 함께 고려한다.

## 10.3 LLM 호출 증가로 인한 비용/지연

턴마다 Router Agent 호출이 추가되어, 기존 2회(Ambiguity Checker + Writer/Tone)에서 최대 3회(+ Router)로 LLM 호출이 늘어난다. 지연이 누적되면 스트리밍 응답 도입([[01_PRD]] 11장 향후 확장) 필요성이 앞당겨질 수 있다.

---

# 11. 최종 역할 정의

Interview Router Agent는 질문을 생성하거나 답변을 판정하지 않는다. 오직 "다음에 어떤 chunk/주제로 이동할지"만 결정하는 라우팅 전담 Agent이며, 그 판단조차 항상 `remaining_chunks`라는 실제 코드 근거 풀 안에서만 이루어지도록 코드 레벨에서 강제된다. 자유도를 높이되 Evidence First 원칙은 타협하지 않는 것이 이 확장의 핵심이다.
