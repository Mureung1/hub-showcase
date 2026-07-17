# AI GM 런타임 및 데이터 연동 규칙

## Metadata

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 문서 타입: technical
- 상태: confirmed
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`
- 마지막 변경: 2026-07-16

## Summary

- Unity를 게임 진행 상태와 규칙 판정의 단일 기준으로 사용한다.
- AI 게임 마스터는 대표 GM, 의도 분석가, 기억 검색가와 선택형 서술가로 구성하고 플레이어에게는 대표 GM의 최종 응답 하나만 표시한다.
- 전문 에이전트는 필요할 때만 호출하고, 승인된 정보 안에서 묘사·대사·자연어 반응과 과거 기억 조회를 보조한다.
- 고정 설정은 RAG, 플레이 중 변하는 값은 Unity 세션 상태로 관리한다.
- AI가 고정 결과, 보상, 성장, 카르마와 엔딩 조건을 임의로 변경하지 못하게 한다.

## Details

### 구성 요소별 책임

| 구성 요소 | 책임 | 금지 사항 |
|---|---|---|
| Unity | 장면 전환, 허용 행동, 판정, Outcome, 상태 변경, 저장·불러오기, 응답 검증, 실제 일러스트 표시 | AI의 서술만 믿고 미검증 상태 변경 |
| 대표 GM | 확정된 Outcome, 허용된 RAG와 전문 결과를 종합해 최종 `GMResponse` 작성 | 판정·보상·분기·상태 임의 변경, 플레이어 행동·대사 대신 결정 |
| 의도 분석가 | 자연어 입력을 현재 장면의 허용 행동으로 구조화하고 명확도 반환 | 판정 실행, Outcome 선택, 신규 규칙·보상·분기 생성 |
| 기억 검색가 | Unity 사건 기록에서 근거 ID가 있는 과거 사실 검색 | 자체 기억 누적, 근거 없는 추론, 미공개 상태 노출 |
| 선택형 서술가 | `cinematic` 장면의 동양 판타지 문체, NPC 말투와 감정선 보강 | 상태·정보·분기·선택지 변경 |
| RAG | 시스템 규칙, 세계관, 인물, 장소, 아이템, 장면 참고 자료와 공개 조건 제공 | 카르마·보유 아이템 등 동적 진행 상태 저장 |
| 세션 상태 | 현재 Phase·장면, 선택 이력, 카르마, 성장, 인벤토리, 정보, 사흉·정수 상태, 사건 기록과 장면 요약 보관 | 공개 조건을 거치지 않은 정보를 AI에 전달 |

### 다중 에이전트 운영 원칙

- 플레이어와 대면하는 역할은 대표 GM 하나로 유지한다.
- 플레이어에게는 모든 내부 처리가 끝난 뒤 대표 GM이 작성한 최종 응답 한 건만 표시한다.
- 모든 에이전트는 호출마다 Unity가 전달한 문맥만 사용하는 무상태 구조로 실행한다.
- 정적 세계관 RAG 검색, 공개 조건 검사, 판정, Outcome 적용과 일러스트 ID 검증은 Unity 기능으로 유지한다.
- 모든 역할은 동일한 `fast_model` 설정을 사용하고 역할별 시스템 지시와 입·출력 계약을 다르게 적용한다.

### 전문 에이전트 호출 규칙

| 역할 | 호출 조건 |
|---|---|
| 의도 분석가 | `text_only` 또는 `choice_and_text` 장면에서 자연어가 입력됨 |
| 기억 검색가 | 현재 씬에 `required_memory_refs`가 있거나 해석한 인물·사건의 마지막 기록이 최근 3개 완료 장면 밖에 있음 |
| 선택형 서술가 | 씬의 `narrative_tier`가 `cinematic` |

- 의도 분석가와 기억 검색가의 필수 호출은 가능한 경우 병렬 실행한다.
- 대표 GM은 필수 문맥만으로 과거 사실을 확정할 수 없을 때 턴당 한 번만 추가 기억 검색을 요청할 수 있다.
- 전문 에이전트가 다른 전문 에이전트를 재귀적으로 호출하지 않는다.
- 선택형 전문 호출은 남은 응답 시간 예산이 부족하면 생략할 수 있지만 의도 검증과 Unity 판정은 생략하지 않는다.

### 턴 처리 흐름

1. Unity가 `turn_id`, 현재 씬, 입력 모드, 허용 선택·행동, 공개 가능한 RAG, 세션 상태, 활성 사실과 최근 3개 완료 장면 요약으로 `TurnContext`를 구성한다.
2. 장면 진입과 고정 선택지 입력은 Unity가 직접 해석하고 자연어 입력은 의도 분석가에게 전달한다.
3. 필요하면 기억 검색가를 호출하고, Unity가 의도 분석 결과의 행동 ID, 대상 ID, 판정 연결과 현재 씬의 허용 범위를 검증한다.
4. Unity가 선택 또는 검증된 의도를 처리하고 필요한 판정을 실행한 뒤 Outcome과 상태 변경을 먼저 확정한다.
5. `cinematic` 장면이면 확정된 Outcome과 공개 가능한 문맥만 서술가에게 전달한다.
6. 대표 GM이 확정된 결과와 검증된 전문 결과를 사용해 최종 `GMResponse`를 작성한다.
7. Unity가 최종 응답을 검증한 뒤 플레이어에게 한 번만 표시한다. 판정과 보상·패널티 정산이 끝난 후 기억 기록과 자동 저장을 완료한다.

### AI 문맥 구성 우선순위

Unity는 현재 장면에 필요한 최소 정보만 다음 순서로 구성한다.

1. 시스템 규칙과 AI GM 행동 제한
2. 현재 장면의 고정 내용, 허용 선택지와 결과 범위
3. 현재 장면과 관련된 인물·장소·아이템·일러스트 ID
4. 현재 세션 상태, 활성 사실과 최근 3개 완료 장면 요약
5. 필요한 경우 기억 검색가가 근거 ID와 함께 반환한 과거 사실
6. 공개 조건을 충족한 관련 세계관·서사 정보

- 미공개 정보와 현재 장면에 불필요한 자료는 문맥에서 제외한다.
- `reveal_condition`은 Unity가 현재 세션 상태로 평가한다.

### AI GM 응답 계약

AI 응답은 Unity가 해석 가능한 JSON 한 건으로 반환한다.

```json
{
  "speaker_id": "narrator",
  "text": "장면 묘사 또는 대사",
  "illustration_id": "ILL_LOCATION_DEFAULT",
  "input_mode": "choice_only",
  "choices": [
    {
      "choice_id": "CHOICE_01",
      "text": "선택지 문구"
    }
  ]
}
```

- `speaker_id`: 등록 화자 ID. 비화자 묘사는 `narrator`를 사용한다.
- `text`: 화면과 로그에 표시할 묘사 또는 대사다.
- `illustration_id`: 현재 공개·등록된 일러스트 ID다.
- `input_mode`: `narrative_only`, `choice_only`, `text_only`, `choice_and_text` 중 하나다.
- `choices`: 현재 장면에 허용된 `choice_id`와 표시 문구 목록이다. `narrative_only`와 `text_only`에서는 빈 목록이어야 하고 `choice_only`와 `choice_and_text`에서는 1개 이상이어야 한다.
- AI는 플레이어의 행동이나 대사를 대신 확정하지 않고 응답 뒤 입력을 기다린다.

### 내부 에이전트 계약

`IntentAnalysis`는 다음 필드를 가진다.

- `schema_version`, `turn_id`
- `intent_class`: `registered_action`, `freeform_no_state_change`, `ambiguous`, `impossible`
- `normalized_action`: 플레이어 의도를 축약한 표현
- `target_ids`: 현재 문맥에 등록된 대상 ID 목록
- `matched_action_id`: `registered_action`일 때 현재 씬의 `action_id`
- `confidence`: `high`, `medium`, `low`

`MemoryRecall`은 다음 필드를 가진다.

- `schema_version`, `turn_id`, `query`
- `facts`: 각 항목이 `fact`, `event_id`, `scene_id`, `entity_ids`를 가지는 목록
- `not_found`: 근거를 찾지 못했는지 여부

`NarrativeDraft`는 다음 필드를 가진다.

- `schema_version`, `turn_id`, `speaker_id`, `text`
- `tone_tags`: 신비, 장엄, 긴장 등 등록된 연출 태그 목록
- `illustration_id`: 현재 장면에 공개·허용된 ID 중 하나

- 대표 GM의 최종 출력은 기존 `GMResponse` 계약을 유지한다.
- Unity는 모든 내부 계약의 스키마 버전, 필수 필드, ID, 열거형 값과 현재 씬의 허용 범위를 검증한다.

### 응답 검증 및 오류 처리

- Unity는 필수 JSON 필드, 타입, 허용 화자, 입력 모드, 현재 장면의 선택지와 등록·공개된 일러스트 ID를 검증한다.
- 검증이 끝나기 전에는 화면과 게임 상태를 변경하지 않는다.
- 첫 검증 실패 시 올바른 형식을 요구하며 한 번 자동 재요청한다.
- 재요청도 실패하면 이전 화면을 유지하고 플레이어에게 `다시 시도`를 제공한다.
- AI 형식 오류를 판정 실패, 패널티 또는 게임 오버로 처리하지 않는다.
- 의도 분석가가 시간 초과, 형식 오류 또는 `low` 명확도를 반환하면 상태를 바꾸지 않고 플레이어에게 입력을 확인한다.
- 기억 검색가가 실패하면 오래된 사실을 임의로 단정하지 않는다. 현재 진행에 불필요하면 계속하고 필수 사실이면 확인 응답을 표시한다.
- 서술가가 실패하면 대표 GM이 기본 동양 판타지 문체로 응답한다.

### 일러스트 ID 규칙

- RAG에는 실제 에셋이나 파일 경로가 아니라 선택 가능한 `illustration_id`만 저장한다.
- Unity는 ID와 실제 일러스트 에셋의 매핑을 보유한다.
- 정확한 그림이 없으면 캐릭터 기본 ID를 사용한다.
- 비화자 배경 묘사는 현재 장소 기본 ID를 사용하고 인물 일러스트를 숨긴다.
- 스포일러 일러스트는 공개 조건 충족 후에만 후보로 전달한다.

### 지도 노드 데이터

- `node_id`: 노드 고유 ID
- `location_name`: 플레이어 표시 장소명
- `clue_text`: 진입 전 표시할 이상 현상 설명
- `scene_id`: 선택 시 진입할 씬 ID
- `node_type`: 사흉, 탐험, 요괴 등 내부 처리 유형
- `related_content_id`: 연결할 사흉·십이지신·보상 콘텐츠 ID
- `node_status`: 잠김, 미완료, 완료 등 현재 상태

- Unity가 전체 노드와 상태를 관리하며 AI에는 플레이어가 선택한 장면 정보만 전달한다.
- `node_type`은 추리 요소를 위해 진입 전 플레이어에게 직접 노출하지 않는다.

### 씬·판정·결과 데이터

씬 데이터는 다음 연결 필드를 가진다.

- `scene_id`, `scene_type`, `location_id`, `input_mode`, `choice_presentation`, `narrative_tier`
- `allowed_choices`, `allowed_actions`, `continue_outcome_id`, `required_memory_refs`, `check_config_id`, `outcomes`, `rag_refs`

- `text_only` 또는 `choice_and_text` 씬의 `allowed_actions`는 자연어로 연결할 수 있는 허용 행동 목록이다.
- 각 허용 행동은 `action_id`, 표시용 설명, 선택적 `check_config_id`, 연결할 `outcome_id`를 가진다.
- `choice_presentation`은 `standard` 또는 `emphasis`며 누락 시 `standard`다. `emphasis`는 `input_mode: choice_only`이고 선택지가 2개 이상인 씬에서만 유효하며 AI 응답이 값을 변경할 수 없다.
- `narrative_only` 씬은 `계속` 입력에 적용할 등록 `continue_outcome_id`를 가져야 한다.
- `narrative_tier`는 `standard` 또는 `cinematic`이며 누락 시 `standard`를 사용한다.
- `required_memory_refs`는 장면 진행에 필수인 과거 사건·인물 참조 ID 목록이다.
- Unity는 `input_mode`, `allowed_choices`, `allowed_actions`, `choice_presentation`, `continue_outcome_id`의 조합을 검증한다. 조합이 유효하지 않으면 다른 모드로 자동 대체하지 않고 이전 화면과 게임 상태를 유지한다.

판정 설정은 장면이 추가될 때마다 사용자 확인 후 개별 설계하며 다음 항목을 가진다.

- 판정 주체, 능력치·자원, 계산 방식, 난이도, 적용 보정, 성공·실패 결과 키

결과 처리 순서는 다음과 같다.

1. Unity가 선택 또는 자연어 입력이 현재 장면에서 허용되는지 확인한다.
2. 필요하면 연결된 Check Config로 판정을 실행한다.
3. Unity가 확정된 Outcome을 적용한다.
4. 카르마, 아이템, 정보, 십이지신, 노드, 사흉·정수와 다음 장면 상태를 갱신한다.
5. AI GM에는 확정된 결과만 전달해 묘사하게 한다.

### RAG 항목 데이터

- `content_id`: RAG 항목 고유 ID
- `content_type`: 시스템 규칙, 세계관, 인물, 장소, 아이템, 장면 참고 자료 등 유형
- `body`: AI GM이 참조할 내용
- `reveal_condition`: 문맥에 포함할 수 있는 공개 조건
- `related_scene_ids`: 참조 가능한 관련 씬 ID 목록
- `illustration_ids`: 해당 자료에서 선택 가능한 등록 일러스트 ID 목록

- 씬의 `rag_refs`는 조회할 `content_id` 목록을 저장한다.
- 카르마, 아이템 보유, 십이지신 성장과 진행 상태는 RAG가 아닌 세션 상태에 저장한다.

### 저장·불러오기와 문맥 복원

- Unity 세이브를 실제 진행 상태의 기준으로 사용한다.
- AI 서비스의 대화 기록 자체를 세이브로 사용하지 않는다.
- Unity는 아이템, 정보, 카르마, 십이지신 성장, 노드, 사흉·정수 상태, NPC 약속·관계와 같은 유의미한 상태 변경을 `SessionEvent`로 기록한다.
- `SessionEvent`는 `event_id`, `turn_id`, `scene_id`, `event_type`, `actor_ids`, `summary`, `state_delta_refs`, `visibility`를 가진다.
- 장면 종료 시 `scene_id`, `completed_at`, `summary`, `event_ids`, `entity_ids`, `visibility`를 갖는 `SceneMemory`를 생성한다.
- 대표 GM에게는 현재 활성 사실과 가장 최근의 완료 장면 3개 `SceneMemory`를 기본 문맥으로 제공한다.
- 기억 검색가는 `visibility`와 현재 세션의 공개 조건을 통과한 기록만 사용한다.
- 자동 저장은 장면의 판정과 보상·패널티 정산이 모두 끝난 뒤 실행한다.
- 수동 저장은 AI 응답 생성, 판정 또는 전투가 진행 중이지 않은 대기 상태에서만 허용한다.
- 자동 저장 슬롯은 1개, 수동 저장 슬롯은 3개다.
- 불러오기 시 저장 이후 로그와 상태를 제외하고 새 AI 문맥을 구성한다.
- 새 문맥에는 저장된 세션 상태, `SessionEvent`, `SceneMemory`, 활성 사실과 현재 장면에 필요한 RAG만 전달한다.
- 에이전트의 기존 대화 스레드는 복원 근거로 사용하지 않는다.
- 같은 장면의 세부 문장은 달라질 수 있으며 과거 확정 판정과 상태는 세이브로 복원한다.
- 게임 오버는 현재 자동 저장을 덮어쓰지 않는다.

### 자연어 입력 예외 처리

| 입력 유형 | 처리 |
|---|---|
| 현재 장면에서 가능하고 규칙이 있는 행동 | 정상 처리 후 필요 시 판정·Outcome 연결 |
| 가능하지만 별도 규칙이 없는 행동 | 세계관에 맞게 반응하되 상태를 바꾸지 않고 선택지를 다시 제시 |
| 의도가 불명확한 입력 | 짧게 되묻거나 재입력을 요청하고 상태를 유지 |
| 명백히 불가능하거나 세계관을 벗어난 행동 | 장면에 맞는 극단적 결말을 묘사하고 게임 오버 처리 |

### 공통 ID 명명 규칙

- 내부 연결 ID는 영문 대문자 접두사와 언더스코어를 사용하고 표시용 한국어 명칭과 분리한다.
- 지도 노드 `NODE_`, 씬 `SCENE_`, 허용 행동 `ACTION_`, 판정 `CHECK_`, 결과 `OUTCOME_`, RAG `CONTENT_`
- 인물 `CHAR_`, 장소 `LOC_`, 아이템 `ITEM_`, 십이지신 `ZODIAC_`, 사흉 `PERIL_`, 일러스트 `ILL_`
- 예시: `SCENE_SHRINE_PHASE_01`, `ILL_HUNDUN_DEFAULT`

### 성능과 내부 기록

- 대표 네트워크 환경의 p95 기준 목표 응답 시간은 `standard` 턴 4초 이하, `cinematic` 턴 8초 이하다.
- 전문 에이전트 호출 기록은 플레이어 로그와 분리한 개발 로그에만 저장한다.
- 개발 로그는 `turn_id`, 에이전트 역할, 처리 시간, 성공 여부, 오류 코드, 근거 ID, 스키마 버전과 최종 채택 여부만 기록한다.
- 프롬프트, 전문 에이전트 응답 원문, 미공개 카르마와 내부 추론 내용은 플레이어에게 노출하지 않는다.

## Gameplay / Production Notes

- 플레이어 경험: 고정 선택지는 언제나 안전한 기본 진행 경로이며 자연어 입력은 허용 장면에서만 추가 자유를 제공한다.
- 자원 흐름: 모든 보상·패널티·성장·정보·카르마 변경은 Unity Outcome을 통해서만 발생한다.
- 구현 고려: AI 요청 전 공개 조건을 검사하고, 응답 검증 완료 전 상태를 변경하지 않으며 선택형 호출을 시간 예산 안에서 제한한다.
- QA 고려: 잘못된 내부·최종 JSON, 미등록 ID, 전문 호출 실패, 로드 후 기억 재구성, 스포일러 차단, Outcome 중복 적용과 응답 시간을 확인한다.

## Open Questions

- TBD: `fast_model` 설정에 사용할 실제 AI 공급자, 모델, 요청 제한과 비용 정책
- TBD: 네트워크 시간 초과·오프라인·서비스 장애 처리
- TBD: 세이브 직렬화 형식과 버전 마이그레이션
- TBD: 판정 난수 재현 여부
- TBD: 전투와 판정의 최종 데이터 스키마 및 계산식

## Sources

- `workspace/projects/chronicles-of-the-twelve-bonds/ideas/temporary_ideas.md`의 `IDEA-20260714-001`
- `workspace/projects/chronicles-of-the-twelve-bonds/approvals/approval_queue.md`의 `APPR-20260716-001`
