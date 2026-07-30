# SPEC-AI-003. FinalAnswer·DecisionNote 서버 생성

- 상태: **작성 완료 (사용자 확인 대기)**
- 기준 문서: `docs/domain-policy.md`(5·6·8장), `docs/data-model.md`(3.3·3.6·3.7), `docs/decisions/ADR-002-data-access-clients.md`, `docs/decisions/ADR-005-ai-pipeline-module-boundaries.md`, `docs/specs/SPEC-AI-002-manager.md`(2.4·9.2·11·12·14·15·16장), `docs/specs/SPEC-SCHEMA-001-core-contracts.md`, `CLAUDE.md` 5·6·8장
- 작성 방식: 0장은 확정된 정책에서 온 것이며 재논의하지 않는다. 1장은 사용자가 직접 결정했다.

---

## 0. 고정 사항 (재질문 안 함)

### 0.1 한 줄 목표

지금까지 브라우저가 Mock으로 만들던 **FinalAnswer와 DecisionNote를 서버가 생성·저장**하도록 교체한다. 이로써 새로고침 후 전 구간이 복원되고, **다음 Question의 Context가 비로소 실제 데이터로 채워진다**(Epic 5 완성).

### 0.2 `domain-policy`가 이미 확정한 것

SPEC-AI-002와 달리 **이 Spec은 설계를 새로 만들지 않는다.** 정책이 이미 정해져 있고 구현 명세만 쓴다.

| 확정 사항 | 근거 |
|---|---|
| 모든 Agenda가 `passed`/`rejected`가 되면 FinalAnswer 생성을 시작한다 | §5.1 |
| 입력은 `passed` Agenda의 **제목·요약·`selectedContent`·근거** + `rejected`의 **제외 사실** | §5.1 |
| **Manager AI가 한 번 생성**한다 | §5.1 |
| 전부 `rejected`면 AI를 호출하지 않고 고정 문구를 저장, `all_agendas_rejected` | §5.2 |
| 정확히 1개 provider만 성공했으면 `single_source_fallback`, **일부 AI 답변이 제외됐다는 사실을 표시** | §5.3 |
| 2개 이상 성공은 `multi_source` | §5.3 |
| **재생성 금지.** Question당 1회, 기존 레코드가 있으면 중복 생성을 거절 | §5.4 |
| DecisionNote는 **FinalAnswer를 근거로 AI가 자동 생성**, Question당 정확히 하나 | §6 |
| 전부 `rejected`면 고정 문구 FinalAnswer를 **그대로 DecisionNote로** 저장 | §6 |
| DecisionNote 사용자 편집·수정·삭제는 MVP 제외 | §6 |
| DecisionNote는 `question_id`만 저장한다 (`chat_id` 없음) | §6 |
| **DecisionNote 저장이 끝난 뒤에만** Question을 `completed`로 변경하고 `completed_at` 기록 | §5.4·§6 |
| 다음 Question은 DecisionNote 저장이 끝난 뒤에만 생성할 수 있다 | §6 |
| 다음 Question Context = **직전 Question의 FinalAnswer + 그보다 이전 Question들의 DecisionNote** | §8-4 |

### 0.3 데이터 모델에서 오는 고정 규칙

- `final_answers`: `question_id` UNIQUE, `content` NOT NULL, `generation_mode` NOT NULL, `prompt_version`, `input_snapshot` jsonb NOT NULL DEFAULT `{}`
- `decision_notes`: `question_id` UNIQUE, `content` NOT NULL, `updated_at`은 유지하되 MVP에서 수정 API 없음
- `questions.context_snapshot` jsonb NOT NULL DEFAULT `{}`, `questions.context_version` varchar(50) NOT NULL DEFAULT `v1`
- 삭제 기능 없음 (§7)

### 0.4 SPEC-AI-002에서 오는 것

- **Agenda 최종 형태** — `kind`·`resolutionReason`·`selectedContent`·`selectedSourceRef`·`stances`·`sourceRefs`가 §9.2 규칙표대로 채워져 저장돼 있다
- **자동 통과 vs 사용자 판단 구분** — `resolutionReason` 기준. 자동 통과 항목에 사용자 판단 문구를 쓰지 않는다 (§12.5)
- **`"NO_VALUE"`는 사용자 행동에서만 발생**한다. AI는 만들지 않는다
- **데이터 접근 클라이언트 이원화** — 시스템 쓰기는 Secret Key + Service 소유권 검증 (ADR-002)
- **SSE 이벤트 명명 체계** — 점 표기, 단계별 `*.done` (§12.2)
- **모델·호출 설정** — `qwen/qwen3.7-plus` via OpenRouter, `response_format json_schema strict`, `require_parameters`, `max_tokens` 미설정 (§15.3)
- **타임아웃은 본문 읽기까지 덮어야 한다** (§2.4.1). `fetch`는 헤더 도착 시 resolve한다
- **관측은 분위수로 본다** (§14.5.1). 꼬리가 긴 분포에서 평균은 대표값이 아니다

### 0.5 제외 범위

| 항목 | 다루는 곳 |
|---|---|
| DecisionNote MD Zip Export | SPEC-EXPORT-001 |
| DecisionNote 사용자 편집 | 후속 버전 (§6) |
| 좌초 복구 (`processing` timeout 회수) | 안정화 |
| BYOK 키 입력 UI | SPEC-SETTINGS-001 |
| 문단↔쟁점 근거 추적 | **백로그 1번** (§15.2) |

---

## 1. 결정 사항 (사용자 확정, 2026-07-31)

| # | 논점 | 결정 | 근거 |
|---|---|---|---|
| **1** | DecisionNote 생성 실패 시 갇힘 | **1회 재시도 → 실패하면 코드가 대체 노트를 만들고 `completed`** | §5.4가 "DecisionNote 저장 후에만 completed"를 요구하므로, 실패하면 Question이 영원히 갇힌다. AI 실패에도 코드가 최소한을 만드는 방식은 §2.5 fallback stance·Manager 완전 실패 고정 문구와 같은 패턴 |
| **2** | AI 호출 횟수 | **FinalAnswer와 DecisionNote를 한 호출로 받는다** | 충돌 0건 경로에서 사용자 판단 없이 대기가 이어진다. 호출 1회 절약. "FinalAnswer를 근거로"는 출력 필드 순서로 지켜진다 |
| **3** | FinalAnswer 근거 검증 | **검증하지 않는다.** 문단↔쟁점 매핑은 백로그 1번으로 | 화면에 표시하지 않을 데이터를 지금 만들 이유가 없다. 입력이 확정된 Agenda로 한정돼 지어낼 여지도 적다 |

### 1.1 결정 3에 따르는 명시적 한계

**Manager 판정에는 §11의 강한 근거 검증이 걸려 있는데 FinalAnswer에는 없다.** 이 비대칭은 의도된 것이다.

| | 검증 |
|---|---|
| Manager `stances[].quotes` | 원문 부분 문자열 대조. 통과 못 하면 폐기 |
| **FinalAnswer `content`** | **없음.** `input_snapshot`으로 재현성만 확보 |

FinalAnswer는 여러 Agenda를 **종합해 새로 쓰는 글**이라 인용 대조가 성립하지 않는다. 지금 할 수 있는 것은 입력을 확정된 Agenda로 한정하고 프롬프트로 제약하는 것뿐이다.

### 1.2 결정 2에 따르는 문서 개정

`domain-policy` §6의 "FinalAnswer 확정 **직후** Manager AI가 FinalAnswer를 **근거로** 요약을 자동 생성"에서 **"직후"를 완화**한다. "근거로"는 그대로 지켜진다 — 같은 호출의 출력 필드 순서에서 FinalAnswer가 앞에 오므로, 모델은 자기가 방금 쓴 글을 요약한다.

---

## 2. 전체 흐름

```text
[코드]  모든 Agenda가 passed/rejected 인지 확인          (§5.1)
[코드]  generation_mode 결정                              (§4)
   ├── 전부 rejected      → AI 미호출, 고정 문구 (§5.2)
   └── passed ≥ 1
[AI]    FinalAnswer + DecisionNote 한 번에 생성            (§3)
[코드]  검증·저장 (final_answers → decision_notes)         (§6)
[코드]  Question을 completed로 전이 + completed_at         (§6.3)
[SSE]   final_answer.done                                  (§8)
```

**호출은 최대 1회다.** 전부 `rejected`면 0회.

### 2.1 트리거

**사용자 행동에 매달지 않는다.** SPEC-AI-002 §12.1이 확정한 규칙을 그대로 따른다.

```text
Agenda 집합이 갱신될 때마다
  → 전부 passed/rejected 인가?
  → 그렇다면 FinalAnswer 생성 시작
```

충돌 0건 경로(3사가 완전히 일치하거나 성공 provider가 1개)에서는 **사용자가 누를 것이 없다.** 이 경로가 정상이며, SPEC-AI-002에서 두 번 갇힘 사고를 낸 지점이다.

### 2.2 지연

| 구간 | 실측/추정 |
|---|---|
| 3사 생성 | 6~28초 |
| Manager (단계 3~7) | 37.9~145.5초 (§14.4) |
| **FinalAnswer + 노트** | **추정 30~60초** — 실측 항목 |

**충돌이 있으면** 사용자 판단이 사이에 들어가 대기가 나뉜다. **충돌 0건이면 연속 대기**가 되므로 SSE 진행 표시가 필수다(§8).

---

## 3. 생성 (AI 호출 1회)

### 3.1 입력

§5.1이 정한 것만 넣는다.

```text
원 질문 (Question.message)
passed Agenda 각각 — title · summary · selectedContent · sourceRefs 요약
rejected Agenda 각각 — title · 제외되었다는 사실
generation_mode
single_source_fallback 이면 — 제외된 provider 목록
```

**넣지 않는 것**

- 3사 원문 전체 — Agenda의 `selectedContent`에 이미 확정된 내용이 들어 있다
- `stances`·`quotes` — 판정 근거이지 최종 답변의 재료가 아니다
- 이전 Question의 Context — FinalAnswer는 이 Question의 결론만 담는다

비신뢰 입력(`Question.message`, Agenda 내용)은 SPEC-AI-002 §16.2의 구분 블록으로 감싼다.

### 3.2 출력 스키마

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "finalAnswer": {
      "type": "string",
      "description": "확정된 내용을 종합한 최종 답변. 입력에 없는 사실을 추가하지 마라. 제외된 쟁점의 내용을 answer에 넣지 마라."
    },
    "decisionNote": {
      "type": "string",
      "description": "위 최종 답변을 요약한 결정 기록. 무엇을 결정했는지가 드러나야 한다."
    }
  },
  "required": ["finalAnswer", "decisionNote"]
}
```

**`finalAnswer`가 앞에 온다.** §8.6의 "필드 순서가 사고 순서" 원칙이다 — 모델은 앞에 쓴 글을 보고 뒤의 요약을 만든다. 이것이 §6의 "FinalAnswer를 **근거로**"를 한 번의 호출에서 지키는 방법이다.

### 3.3 프롬프트 지시

`prompts/manager/final/v1.md`에 둔다. 담아야 할 것:

```text
확정된 쟁점들의 내용을 종합해 하나의 답변으로 만들어라.

입력에 없는 사실을 추가하지 마라.
제외된 쟁점의 내용을 답변에 넣지 마라 — 사용자가 뺀 것이다.
어느 AI가 말했는지를 쓰지 마라 — 이미 사용자가 확정한 내용이다.
```

**`single_source_fallback`이면 추가로**:

```text
이 답변은 하나의 AI만 응답해 만들어졌다.
여러 AI가 합의했다고 표현하지 마라.
```

§5.3이 "다중 AI 합의로 표현하지 않으며, 일부 AI 답변이 제외되었다는 사실을 표시한다"를 요구한다. **화면 표시는 §9에서, 문구 제약은 여기서** 담당한다.

### 3.4 모델·호출 설정

SPEC-AI-002 §15.3을 그대로 따른다.

| 항목 | 값 |
|---|---|
| 모델 | `qwen/qwen3.7-plus` (`MANAGER_MODEL` 공유) |
| `response_format` | `json_schema` + `strict: true` |
| `provider` | `require_parameters: true` |
| `max_tokens` | 설정하지 않음 |
| `reasoning` | ⚠️ **무설정으로 시작.** 단계 6과 특성이 다르다 — 인용 복사가 아니라 종합·요약이다. §14.5.4에서 단계 3에 `low`가 역효과였던 선례가 있으므로 실측 없이 적용하지 않는다 |
| 타임아웃 | **120초.** 단계 6과 같다. §2.4.1대로 **본문 읽기까지 덮어야 한다** |
| 재시도 | 타임아웃은 재시도하지 않는다 (§2.4.2). 네트워크·5xx·429·스키마 실패는 1회 |

---

## 4. `generation_mode` 결정 (코드)

```text
passed Agenda 수 = 0                    → all_agendas_rejected  (AI 미호출)
성공한 SourceAnswer provider 수 = 1     → single_source_fallback
그 외                                    → multi_source
```

**판단 순서가 중요하다.** 전부 rejected가 먼저다 — 그때는 provider 수와 무관하게 AI를 부르지 않는다.

`single_source_fallback`은 §5.3이 **"정확히 하나의 Provider만 성공한 경우에만"**으로 못박았다. 2개 이상은 `multi_source`다.

### 4.1 `all_agendas_rejected` 경로

AI를 호출하지 않는다.

```text
FinalAnswer.content = "모든 Agenda가 충돌하였습니다. 다시 질문 부탁드립니다."   (§5.2 고정 문구)
DecisionNote.content = 위와 동일                                              (§6)
generation_mode = all_agendas_rejected
prompt_version = null
```

§6이 "고정 문구 FinalAnswer를 **그대로** DecisionNote로 저장"이라고 정했다. 요약하지 않는다.

---

## 5. 실패 처리

### 5.1 FinalAnswer 생성 실패

AI 호출이 재시도 후에도 실패하면 **저장하지 않는다.** Question은 `processing`에 남는다.

**재생성 금지(§5.4)는 "성공적으로 저장된 FinalAnswer"에 적용된다.** 저장되지 않았으면 다시 시도할 수 있다. 이 구분을 코드가 지켜야 한다 — `final_answers`에 행이 있는지로 판단한다.

⚠️ 이 경우 Question이 `processing`에 남는 것은 **의도된 상태**이며, 좌초 복구(안정화 범위)가 회수한다. 사용자에게는 재시도 수단이 필요하나 **이번 범위 밖**이다(§15.1).

### 5.2 DecisionNote 생성 실패 — 결정 1

결정 2로 한 번에 받으므로 "FinalAnswer는 성공하고 노트만 실패"하는 경우는 **파싱·검증 단계에서만** 생긴다(예: `decisionNote`가 빈 문자열).

```text
1차 : DecisionNote만 1회 재시도 (FinalAnswer는 이미 있으므로 요약만 다시 요청)
2차 실패 : 코드가 대체 노트를 만들고 저장 → completed
```

**대체 노트는 코드가 만든다.**

```text
[Question.message 한 줄]

결정 사항
- {passed Agenda title} — {selectedContent 첫 문장}
  ...

제외한 항목
- {rejected Agenda title}
```

요약은 아니지만 **사실은 정확하다.** DecisionNote의 목적이 "무엇을 결정했는지 기록"이므로 목적을 충족한다.

**§12.5의 분류 규칙을 지킨다** — 자동 통과 항목(`auto_consensus`·`auto_single_source`)에 "내 결정 반영" 같은 사용자 판단 문구를 쓰지 않는다.

`prompt_version`에 대체 생성임을 표시한다(예: `fallback`).

### 5.3 왜 이렇게 하는가

§5.4·§6이 "DecisionNote 저장이 끝나야 `completed`"를 요구한다. **정책 자체가 전제를 만들고 있다.**

SPEC-AI-002에서 같은 구조의 갇힘이 네 번 나왔다.

```text
T-019.1  single_source 자동 통과 → 충돌 0건 → 트리거 없음 → 갇힘
T-019.4  Manager 완전 실패      → Agenda 0건 → 트리거 없음 → 갇힘
T-019.5  복원 가드가 status 기반 → 새 경로를 막음
T-019.6  배지가 "쟁점 있음" 전제 → 사실과 다른 표시
```

**AI가 실패해도 코드가 최소한을 만든다**는 원칙으로 이 계열을 끊는다. §2.5의 fallback stance, Manager 완전 실패의 고정 문구와 같은 방식이다.

---

## 6. 저장과 상태 전이

### 6.1 클라이언트 구분 (ADR-002)

| 작업 | 클라이언트 |
|---|---|
| FinalAnswer·DecisionNote 저장 | **Secret Key** + Service가 소유권 검증 |
| 조회 | 사용자 JWT + RLS |

클라이언트가 보낸 userId는 신뢰하지 않는다.

### 6.2 저장 순서

```text
1. final_answers INSERT   (question_id UNIQUE — 중복이면 409)
2. decision_notes INSERT  (question_id UNIQUE)
3. questions UPDATE       status = completed, completed_at = now()
```

**중복 생성 거절(§5.4)**: `final_answers`에 이미 행이 있으면 **409**로 거절한다. UNIQUE 제약이 최후 방어선이지만, Service가 먼저 확인해 명확한 오류를 낸다.

### 6.3 `completed` 전이

**3단계가 모두 성공해야 `completed`가 된다.** DecisionNote가 §5.2 경로(대체 노트 포함)로라도 저장돼야 한다.

이 전이를 **서버가 한다.** SPEC-AI-002까지는 FinalAnswer가 web Mock이라 web이 PATCH로 전이했으나, 이제 서버가 소유한다.

⚠️ **web의 기존 전이 경로를 제거해야 한다.** 남겨두면 서버와 web이 둘 다 전이를 시도한다. T-019.4에서 `markQuestionCompleted`가 Mock 경로에만 있어 화면만 완료되고 DB는 안 바뀌었던 것의 반대 상황이다.

### 6.4 `input_snapshot`

재현성을 위해 생성에 사용한 것을 그대로 담는다.

```text
agendas       : passed/rejected 각각의 id·title·resolutionReason·selectedContent
generationMode
excludedProviders : single_source_fallback 일 때
model · promptVersion
```

§14.5.1의 교훈대로 **관측 지표는 분위수로** 기록한다(§11).

---

## 7. Context 구성 (Epic 5 완성)

### 7.1 지금까지의 상태

`sourceAnswers.service.ts`가 이미 `questions.context_snapshot`에 저장하는 배선을 갖고 있다. **그런데 재료가 없었다** — FinalAnswer·DecisionNote가 web Mock이라 DB에 없었기 때문이다.

**이 Spec이 그 재료를 채운다.** Epic 5(맥락 연속 질문)가 비로소 완성된다.

### 7.2 구성 규칙 (§8-4)

```text
직전 Question           → FinalAnswer 전문
그보다 이전 Question들  → DecisionNote
```

**직전만 FinalAnswer인 이유**: 바로 앞 결론은 자세히, 그 이전은 요약으로. 토큰을 아끼면서 맥락을 유지한다.

### 7.3 상한

컨텍스트가 무한히 자라면 3사 호출 입력이 비대해진다.

```text
DecisionNote는 최근 N개까지만 포함한다  (기본 N = 5, 설정값)
초과분은 포함하지 않고 그 사실을 context_snapshot에 기록한다
```

**조용히 자르지 않는다.** 몇 개가 생략됐는지 `context_snapshot`에 남긴다(§14의 "no silent caps" 원칙).

### 7.4 `context_version`

구성 규칙이 바뀌면 버전을 올린다. 현재 `v1`.

---

## 8. SSE 배선

SPEC-AI-002 §12.2의 스트림을 이어 쓴다. **새 스트림을 열지 않는다.**

| 이벤트 | 시점 |
|---|---|
| `final_answer.progress` | 생성 시작 (충돌 0건 경로의 무음 구간 방지) |
| `final_answer.done` | FinalAnswer·DecisionNote 저장 완료, Question `completed` |

**web의 종료 판정은 §12.2 규칙 그대로**다 — 특정 이벤트 이름을 하드코딩하지 않고 "스트림 닫힘 + 마지막 `*.done` 스냅샷"으로 판단한다. `final_answer.done`이 추가돼도 web 로직은 바뀌지 않아야 한다.

**충돌이 있는 경로**에서는 사용자 판단 후 생성이 시작되므로 SSE 스트림이 이미 닫혀 있다. 이때는 **PATCH 응답으로 결과를 받거나 GET으로 조회**한다. 두 경로를 구분해 설계한다.

---

## 9. web 재배선

### 9.1 제거 대상

`buildMockFinalAnswer`·`buildMockDecisionNote`와 그 호출부 **5곳**(`useChatWorkspace.ts` 361·720·864·1164행 등).

**⚠️ SPEC-AI-002 T-019.4의 교훈**: `buildMockAgendas`가 3곳에서 호출됐고, 각각 고치려다 분기가 어긋날 뻔했다. **공급원을 결정하는 지점을 하나로 모아라.** 그 위쪽은 Mock인지 서버인지 모르고, 아래쪽은 같은 계약의 FinalAnswer를 받는다.

`?scenario=` 개발 경로는 기존 Mock 흐름을 유지한다.

### 9.2 새 경로를 만들 때 확인할 것

SPEC-AI-002에서 네 번 반복된 결함 유형이다. **전부 브라우저를 실제로 열어야만 발견됐다.**

```text
□ 기존 경로에만 있던 처리가 새 경로에도 있는가 (저장·전이·복원)
□ SSE 경로를 고쳤으면 GET 복원 경로도 고쳤는가
□ 화면만 바뀌고 DB는 안 바뀌는 곳이 없는가
□ 상태로 분기하는 가드가 새 경로를 막지 않는가
□ 표시 문구가 새 경로에서도 사실인가
```

### 9.3 표시 요구

- **`single_source_fallback`** — 일부 AI 답변이 제외됐다는 사실을 표시한다 (§5.3). **"합의"·"일치" 표현 금지**
- **`all_agendas_rejected`** — 고정 문구 표시. 쟁점 목록·자동 통과 요약을 만들지 않는다
- **대체 노트(§5.2)** — 특별한 표시를 하지 않는다. 사실이 정확하므로 사용자가 구분할 필요가 없다

---

## 10. 스키마·정책 변경 목록

### 10.1 Zod 계약 (`packages/shared`)

| 대상 | 변경 |
|---|---|
| `FinalAnswerSchema` | 기존 유지. `inputSnapshot` 형태 확정 |
| `DecisionNoteSchema` | 기존 유지 |
| `QuestionStreamEventSchema` | `final_answer.progress`·`final_answer.done` 추가 |

### 10.2 DB 마이그레이션

**없다.** `final_answers`·`decision_notes`는 이미 존재하고 필요한 컬럼이 다 있다.

### 10.3 기준 문서 개정

| 문서 | 내용 |
|---|---|
| `domain-policy.md` §6 | "FinalAnswer 확정 **직후**"를 완화 — 한 호출로 함께 생성해도 "근거로"는 지켜진다 (결정 2) |
| `domain-policy.md` §8-4 | Context 상한(최근 N개)을 명시 |
| `SPEC-AI-002` §12.5 | web 전이 주체가 서버로 넘어감을 반영 |

---

## 11. 관측 지표

`final_answers.input_snapshot` 또는 별도 메타에 기록한다.

| 지표 | 의미 |
|---|---|
| 생성 지연 | **p50·p90·최대** (§14.5.1 — 평균 금지) |
| `completion_tokens` / `reasoning_tokens` | 추론 비중. `reasoning` 설정 판단 재료 |
| 타임아웃 발생 | 120초가 적정한지 |
| `decisionNoteFallbackRate` | 대체 노트가 쓰인 비율. 높으면 프롬프트 문제 |
| `generationModeDist` | 세 모드의 실제 분포 |
| Context 생략 건수 | §7.3의 상한에 걸린 횟수 |

---

## 12. 보안

SPEC-AI-002 §16과 같다. 신뢰할 수 없는 입력은 셋이다.

| 입력 | 경로 |
|---|---|
| `Question.message` | 사용자 직접 입력 |
| Agenda `selectedContent` | 3사 답변에서 왔거나 **사용자가 직접 입력**했다 |
| Agenda `title`·`summary` | Manager 생성 |

**두 번째가 새롭다.** `user_composed`로 사용자가 직접 쓴 내용이 그대로 FinalAnswer 프롬프트에 들어간다. §16.2의 구분 블록으로 감싸고, 출력이 스키마에 갇혀 있다는 구조적 방어에 의존한다.

키는 백엔드 env에만. 프롬프트·에러·로그·SSE에 넣지 않는다.

---

## 13. Acceptance Criteria

- [ ] **AC1 (트리거)** — Agenda 집합이 갱신될 때마다 전부 `passed`/`rejected`인지 확인해 생성을 시작한다. **충돌 0건 경로**(3사 일치·단일 provider)에서도 갇히지 않는다.
- [ ] **AC2 (모드 분기)** — `all_agendas_rejected`는 AI를 호출하지 않고 고정 문구를 FinalAnswer·DecisionNote에 동일하게 저장한다. `single_source_fallback`은 **정확히 1개** provider 성공일 때만. 2개 이상은 `multi_source`.
- [ ] **AC3 (한 호출)** — FinalAnswer와 DecisionNote를 한 번의 AI 호출로 받는다. `finalAnswer`가 출력 스키마에서 앞에 온다.
- [ ] **AC4 (재생성 금지)** — 이미 저장된 Question에 생성을 요청하면 **409**. 저장에 실패했던 Question은 다시 시도할 수 있다.
- [ ] **AC5 (노트 실패 대체)** — DecisionNote 생성이 실패하면 1회 재시도하고, 그래도 실패하면 **코드가 대체 노트를 만들어 저장하고 `completed`로 전이**한다. 갇히지 않는다. 대체 노트에 자동 통과 항목의 사용자 판단 문구가 없다(§12.5).
- [ ] **AC6 (저장·전이)** — 시스템 쓰기(Secret Key + 소유권 검증)로 저장한다. `final_answers`·`decision_notes` UNIQUE를 통과한다. **DecisionNote 저장 후에만** `completed` + `completed_at`. 서버가 전이하고 **web의 기존 전이 경로는 제거된다.**
- [ ] **AC7 (복원)** — 새로고침 후 FinalAnswer·DecisionNote가 GET으로 복원된다. 미소유 404, 무토큰 401, 위조 `userId` 무시.
- [ ] **AC8 (SSE)** — `final_answer.progress` → `final_answer.done`이 기존 스트림에 이어진다. **충돌 0건 경로에서 무음 구간이 없다.** web의 종료 판정 로직은 §12.2 규칙이라 수정이 필요 없다.
- [ ] **AC9 (Context)** — 다음 Question의 `context_snapshot`에 직전 FinalAnswer + 이전 DecisionNote들이 실제로 담긴다. 상한 초과 시 **생략 건수가 기록된다**(조용한 절단 금지).
- [ ] **AC10 (web 재배선)** — `buildMockFinalAnswer`·`buildMockDecisionNote`가 서버 경로에서 제거된다(`?scenario=`에만 잔존). **공급원 결정 지점이 하나**다. `single_source_fallback`에 제외 사실이 표시되고 "합의"·"일치" 표현이 없다.
- [ ] **AC11 (실측)** — 생성 지연을 **분위수로** 기록한다. 타임아웃 발생 건수, `decisionNoteFallbackRate`, `generationModeDist`를 보고한다.
- [ ] **AC12 (검증)** — 루트 typecheck·build 통과, lint는 web만. `?scenario=` 4종 회귀 없음. 키 미노출.

---

## 14. 알려진 한계

| 한계 | 해소 |
|---|---|
| **FinalAnswer에 근거 검증이 없다** (§1.1) | 백로그 1번 |
| FinalAnswer 생성 실패 시 Question이 `processing`에 남는다 | 좌초 복구 (안정화). 사용자 재시도 수단 없음 |
| DecisionNote 사용자 편집 불가 | 후속 버전 (§6) |
| Context 상한 N=5의 적정성 미검증 | 실측 후 조정 |
| `reasoning` 설정 미결정 | 무설정으로 시작, 실측 후 판단 |

---

## 15. 백로그

### 15.1 1번 — FinalAnswer 문단↔쟁점 근거 추적

**내용**: 출력을 문단 배열로 받고 각 문단에 `agendaIds`(런타임 enum)를 붙인다. 화면에서 "이 부분은 어느 쟁점에서 왔는지"를 표시한다.

**왜 미뤘나**: 화면 표시를 이번 범위에 넣지 않기로 했으므로, 데이터만 쌓는 셈이 된다. 입력이 확정된 Agenda로 한정돼 지어낼 여지도 적다.

**⚠️ 소급 불가**: 문단↔쟁점 매핑은 **생성 시점에만** 알 수 있다. §5.4가 재생성을 금지하므로 **이미 만들어진 FinalAnswer에는 영영 매핑을 붙일 수 없다.** 이 기능을 넣는 시점 이후의 FinalAnswer만 추적 가능해진다.

**관련**: §1.1(검증 비대칭), SPEC-AI-002 §11(Manager의 grounding)

---

## 16. 제외 범위·후속 연결

| 항목 | 다루는 곳 |
|---|---|
| DecisionNote MD Zip Export | SPEC-EXPORT-001 |
| 좌초 복구 | 안정화 |
| BYOK 키 입력 UI | SPEC-SETTINGS-001 |
| DecisionNote 편집 | 후속 버전 |

---

## 17. 개정 기록

| 일자 | 내용 |
|---|---|
| 2026-07-31 | 최초 작성. `domain-policy` §5·§6·§8이 이미 확정한 정책 위에 구현 명세만 작성. 사용자 결정 3건 — ① 노트 실패 시 코드 대체 노트로 갇힘 차단 ② FinalAnswer·DecisionNote를 한 호출로 ③ 근거 검증은 백로그 1번으로 유보. SPEC-AI-002에서 네 번 반복된 "새 경로가 기존 전제와 어긋나는" 결함 유형을 §9.2 체크리스트로 명시 |
