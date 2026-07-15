# Approval Queue

AI가 생성한 변경안과 신규 문서 초안을 검토하기 위한 공간이다.

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`

## Pending

대기 중인 항목이 없다.

## Approved

승인 후 아직 적용되지 않은 항목이 없다.

## Needs Reconfirmation

적용 직전 원본 또는 영향 범위가 달라져 명시적 재확인이 필요한 항목이 없다.

## Applied

### APPR-20260716-001: 게임마스터 다중 에이전트 흐름

#### Metadata

- ID: APPR-20260716-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 상태: applied
- 생성일: 2026-07-16
- 요청자: 사용자
- 대상 문서 경로: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`
- 기준 Git 커밋: `09ad04a703ec23de1c5882d3b43f3777d5924523`
- 비교 대상: 섹션 `구성 요소별 책임`, `AI 문맥 구성 우선순위`, `AI GM 응답 계약`, `응답 검증 및 오류 처리`, `저장·불러오기와 문맥 복원`, `Open Questions`
- 변경 타입: update
- 관련 workflow: `document_change > update_existing_document > propose_change`

#### Proposal

플레이어에게는 대표 GM의 최종 응답 하나만 표시하되 내부에서 의도 분석가, 기억 검색가와 선택형 서술가를 필요할 때만 호출하는 다중 에이전트 흐름을 정의한다. Unity는 규칙, 판정, Outcome과 상태 변경의 단일 기준을 유지한다.

#### Review Notes

- 위험도: 중간
- 충돌 가능성: 기존 Unity 최종 권한과 단일 플레이어 응답 규칙을 유지하므로 직접 충돌은 없음. AI GM 하나에 묶여 있던 내부 책임을 분리하는 변경임
- 누락 정보: 실제 AI 공급자와 모델명, 세이브 직렬화 형식과 버전 마이그레이션은 후속 결정으로 유지
- 작성 당시 원본 요약: Unity가 상태·규칙을 통제하고 단일 AI GM이 묘사·대사·자연어 반응·일러스트 ID를 생성한다. 세션 상태와 현재 장면에 필요한 RAG로 AI 문맥을 구성하며, AI 응답은 Unity가 검증한다.
- 적용 전 재확인: 2026-07-16 기준 대상 문서가 기준 커밋 `09ad04a703ec23de1c5882d3b43f3777d5924523`과 일치하고 비교 대상 및 영향 범위에 추가 변경이 없음

#### Draft

##### 다중 에이전트 운영 원칙

- 플레이어와 대면하는 역할은 `대표 GM` 하나로 유지한다.
- 플레이어에게는 모든 내부 처리가 끝난 뒤 대표 GM이 작성한 최종 응답 한 건만 표시한다.
- 모든 에이전트는 호출마다 Unity가 전달한 문맥만 사용하는 무상태 구조로 실행한다.
- 정적 세계관 RAG 검색, 공개 조건 검사, 판정, Outcome 적용과 일러스트 ID 검증은 에이전트로 분리하지 않고 Unity 기능으로 유지한다.
- 모든 역할은 동일한 `fast_model` 설정을 사용하고 역할별 시스템 지시와 입·출력 계약을 다르게 적용한다.

##### 역할별 책임

| 역할 | 호출 조건 | 책임 | 금지 사항 |
|---|---|---|---|
| 대표 GM | 모든 장면 응답 | 확정된 Outcome, 허용된 RAG와 전문 결과를 종합해 최종 `GMResponse` 작성 | 판정·보상·분기·상태 임의 변경, 플레이어 행동 대신 확정 |
| 의도 분석가 | `choice_and_text` 장면에서 자연어가 입력됨 | 입력을 현재 장면의 허용 행동으로 구조화하고 명확도 반환 | 판정 실행, Outcome 선택, 신규 규칙·보상·분기 생성 |
| 기억 검색가 | 최근 3개 완료 장면보다 오래된 사건 참조가 필요함 | Unity 사건 기록에서 근거 ID가 있는 과거 사실만 검색 | 자체 기억 누적, 근거 없는 추론, 미공개 상태 노출 |
| 선택형 서술가 | 씬의 `narrative_tier` 값이 `cinematic` | Unity가 확정한 결과를 바탕으로 동양 판타지 문체, NPC 말투와 감정선 보강 | 상태·정보·분기·선택지 변경 |

##### 턴 처리 흐름

1. Unity가 `turn_id`, 현재 씬, 입력 모드, 허용 선택·행동, 공개 가능한 RAG, 세션 상태, 활성 사실과 최근 3개 완료 장면 요약으로 `TurnContext`를 구성한다.
2. 장면 진입과 고정 선택지 입력은 Unity가 직접 해석한다. 자연어 입력은 의도 분석가에게 전달한다.
3. 현재 씬에 `required_memory_refs`가 있거나, 입력에서 해석한 인물·사건의 마지막 관련 기록이 최근 3개 장면 밖에 있으면 기억 검색가를 호출한다. 의도 분석가와 기억 검색가의 필수 호출은 가능한 경우 병렬 실행한다.
4. Unity가 의도 분석 결과의 행동 ID, 대상 ID, 판정 연결과 현재 씬의 허용 범위를 검증한다.
5. 대표 GM은 필수 문맥만으로 과거 사실을 확정할 수 없을 때 턴당 한 번만 추가 기억 검색을 요청할 수 있다. 전문 에이전트가 다른 전문 에이전트를 재귀적으로 호출하지 않는다.
6. Unity가 선택 또는 검증된 의도를 처리하고 필요한 판정을 실행한 뒤 Outcome과 상태 변경을 먼저 확정한다.
7. `cinematic` 장면이면 확정된 Outcome과 공개 가능한 문맥만 서술가에게 전달한다. `standard` 장면은 서술가를 호출하지 않는다.
8. 대표 GM이 확정된 결과와 검증된 전문 결과를 사용해 최종 `GMResponse`를 작성한다.
9. Unity가 최종 응답을 검증한 뒤 플레이어에게 한 번만 표시한다. 판정과 보상·패널티 정산이 끝난 후 기억 기록과 자동 저장을 완료한다.

##### 자연어 허용 행동과 의도 분석

- `choice_and_text` 씬은 자연어로 연결할 수 있는 `allowed_actions`를 선택적으로 가진다.
- 각 허용 행동은 `action_id`, 표시용 설명, 선택적 `check_config_id`, 연결할 `outcome_id`를 가진다.
- 행동 ID는 `ACTION_` 접두사와 영문 대문자·언더스코어를 사용한다.
- 의도 분석가는 입력을 `registered_action`, `freeform_no_state_change`, `ambiguous`, `impossible` 중 하나로 분류한다.
- `registered_action`은 현재 씬에 실제 등록된 `action_id`를 반환해야 하며 Unity 검증을 통과한 경우에만 판정과 Outcome으로 연결한다.
- `freeform_no_state_change`는 세계관에 맞는 반응만 생성하고 기존 선택지를 다시 제시한다.
- `ambiguous`는 상태를 유지하고 짧게 되묻는다.
- `impossible`은 Unity가 현재 장면의 세계관·허용 범위와 대조한 뒤 기존 자연어 예외 규칙에 따라 처리한다.

##### 내부 에이전트 계약

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

##### 세션 기억 저장과 검색

- Unity는 아이템, 정보, 카르마, 십이지신 성장, 노드, 사흉·정수 상태, NPC 약속·관계와 같은 유의미한 상태 변경을 `SessionEvent`로 기록한다.
- `SessionEvent`는 `event_id`, `turn_id`, `scene_id`, `event_type`, `actor_ids`, `summary`, `state_delta_refs`, `visibility`를 가진다.
- 장면 종료 시 `SceneMemory`를 생성한다. `SceneMemory`는 `scene_id`, `completed_at`, `summary`, `event_ids`, `entity_ids`, `visibility`를 가진다.
- 대표 GM에게는 현재 활성 사실과 가장 최근의 완료 장면 3개 `SceneMemory`를 기본 문맥으로 제공한다.
- 기억 검색가는 `visibility`와 현재 세션의 공개 조건을 통과한 기록만 사용한다.
- 불러오기 시 세이브에 저장된 `SessionEvent`, `SceneMemory`, 활성 사실과 현재 씬으로 새 문맥을 구성한다. 에이전트의 기존 대화 스레드는 복원 근거로 사용하지 않는다.

##### 전문 에이전트 실패 처리

- 의도 분석가가 시간 초과, 형식 오류 또는 `low` 명확도를 반환하면 상태를 바꾸지 않고 플레이어에게 입력을 확인한다.
- 기억 검색가가 실패하면 오래된 사실을 임의로 단정하지 않는다. 현재 진행에 불필요하면 계속하고 필수 사실이면 확인 응답을 표시한다.
- 서술가가 실패하면 대표 GM이 기본 동양 판타지 문체로 응답한다.
- 대표 GM의 최종 응답 형식이 틀리면 현재 규칙대로 한 번 자동 재요청하고 다시 실패하면 이전 화면과 `다시 시도`를 유지한다.
- 선택형 전문 호출은 남은 응답 시간 예산이 부족하면 생략할 수 있지만 의도 검증과 Unity 판정은 생략하지 않는다.

##### 성능과 내부 기록

- 대표 네트워크 환경의 p95 기준 목표 응답 시간은 `standard` 턴 4초 이하, `cinematic` 턴 8초 이하다.
- 전문 에이전트 호출 기록은 플레이어 로그와 분리한 개발 로그에만 저장한다.
- 개발 로그는 `turn_id`, 에이전트 역할, 처리 시간, 성공 여부, 오류 코드, 근거 ID, 스키마 버전과 최종 채택 여부만 기록한다.
- 프롬프트, 전문 에이전트 응답 원문, 미공개 카르마와 내부 추론 내용은 플레이어에게 노출하지 않는다.

##### QA 기준

- 선택지 전용 장면에서 의도 분석가가 호출되지 않는지 확인한다.
- 자연어 규칙 행동이 현재 씬의 `action_id`와 Check Config에만 연결되는지 확인한다.
- 규칙 없는 자유 행동과 불명확한 입력에서 상태·보상·자동 저장이 임의로 발생하지 않는지 확인한다.
- 최근 3개 장면과 그보다 오래된 사건이 각각 기본 문맥과 근거 검색으로 복원되는지 확인한다.
- 저장·불러오기 후 같은 `SessionEvent`, `SceneMemory`, 활성 사실과 공개 조건이 재구성되는지 확인한다.
- `cinematic` 장면에서만 서술가가 호출되고 실패 시 기본 문체로 대체되는지 확인한다.
- 전문 실패, 스포일러 차단, Outcome 중복 적용 방지, 최종 응답 1회 표시와 내부 로그 항목을 검증한다.
- 대표 네트워크 환경에서 `standard` 턴과 `cinematic` 턴의 p95 응답 시간을 측정한다.

##### Open Questions 변경

- `AI 로그 요약의 길이와 압축 기준`은 장면 종료 요약과 최근 3개 장면 유지 방식으로 확정하여 Open Questions에서 제거한다.
- `AI 공급자, 모델, 요청 제한과 비용 정책`은 실제 제품 선택 전까지 TBD로 유지하되 모든 역할은 공통 `fast_model` 설정을 사용한다.
- `네트워크 시간 초과·오프라인·서비스 장애 처리`와 `세이브 직렬화 형식과 버전 마이그레이션`은 TBD로 유지한다.

#### Decision History

##### Decision Entry

- 결정: 승인 및 적용
- 결정자: 사용자
- 결정일: 2026-07-16
- 이유: `APPR-20260716-001`의 게임마스터 다중 에이전트 흐름을 명시적으로 승인함
- 결정 당시 Draft 요약: 대표 GM, 의도 분석가, 기억 검색가, 선택형 서술가의 선택 호출 흐름과 세션 기억·실패·성능 규칙

#### Reconfirmation

- 진입 사유: 승인 항목 적용 직전 원본 재확인
- 감지일: 2026-07-16
- 현재 원본 요약: Unity가 규칙·상태의 단일 기준이고 AI GM이 묘사·대사·자연어 반응을 생성하며 Unity가 최종 JSON을 검증함
- 비교 결과: 기준 커밋과 현재 대상 문서가 일치함. 적용 전 SHA-256 `05776b6b17dfaddb46137ad1e2071d9bbb8f3d667af2a10e364d080b4a1dbbf6`
- 후속 상태: applied
- 재확인 결정자: 사용자
- 재확인 결정일: 2026-07-16
- 재확인 이유: 원본 및 영향 범위 일치를 확인하고 승인된 Draft를 적용함

#### Links

- 관련 결정 로그: `DEC-20260716-001`
- 관련 버전 기록: `VER-20260716-001`
- 근거 파일: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/visual_novel_ui.md`
- 상위/대체 승인 항목: 없음

---

### APPR-20260715-001: 비주얼 노벨 UI 기획서 및 예시 목업

#### Metadata

- ID: APPR-20260715-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 상태: applied
- 생성일: 2026-07-15
- 요청자: 사용자
- 대상 문서 경로: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/visual_novel_ui.md`
- 기준 Git 커밋: `32cdfbadd792166066c9dccc268cb9b255d762d0`
- 비교 대상: 신규 문서 제목/주제 `비주얼 노벨 UI 기획서`
- 변경 타입: create
- 관련 workflow: `document_change > create_new_document > write_design_doc`

#### Proposal

`16:9`, `1920×1080`을 기준으로 비주얼 노벨 플레이 화면, 지도 화면, 보조 메뉴, 일러스트 ID 표시 규칙을 하나의 UI 기획서로 분리한다. 검토용 예시 목업은 `workspace/projects/chronicles-of-the-twelve-bonds/approvals/assets/visual_novel_ui_mockup_1920x1080_v1.png`에 연결한다.

#### Review Notes

- 위험도: 중간
- 충돌 가능성: 관련 확정 문서가 없어 직접 충돌은 없음
- 누락 정보: 월드맵 디자인, 실제 폰트·색상·안전 영역, 로그 세부 표시 형식은 TBD
- 작성 당시 원본 요약: 없음
- 적용 전 재확인: 2026-07-15 기준 동일 제목·역할의 확정 문서가 없고 기준 Git 커밋이 일치함

#### Draft

# 비주얼 노벨 UI 기획서

## Metadata

- 문서 타입: ui
- 상태: confirmed
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`
- 마지막 변경: 2026-07-15

## Summary

- PC용 `16:9`, `1920×1080`을 기준 화면으로 사용한다.
- 장면은 상단 일러스트와 하단 대화·선택 영역으로 구성한다.
- 여정 목적지는 별도의 지도 화면에서 노드로 선택한다.
- 로그와 성장·수집·저장 기능은 보조 메뉴로 분리한다.

## Details

### 화면 기준

- 기준 해상도: `1920×1080`
- 기준 화면비: `16:9`
- 다른 16:9 PC 해상도에서는 Unity UI 스케일링으로 동일한 정보 위계와 배치를 유지한다.
- 화면 상단 약 70%는 장면 일러스트, 하단 약 30%는 화자·본문·입력 영역을 기본값으로 한다.

### 비주얼 노벨 장면 화면

- 상단에 AI 게임 마스터가 지정한 `illustration_id`의 일러스트를 표시한다.
- 하단에 화자명, 장면 묘사 또는 대사, 현재 선택지를 표시한다.
- `choice_only` 장면은 선택지만 표시한다.
- `choice_and_text` 장면은 선택지 아래에 자연어 입력창을 함께 표시한다.
- 자연어 입력창은 필요한 장면에서만 자연스럽게 나타나며 별도의 안내 팝업은 사용하지 않는다.
- 선택지와 자연어 입력은 플레이어가 응답하기 전까지 확정되지 않는다.

### 일러스트 표시 규칙

- AI는 등록된 `illustration_id`만 반환하고 Unity가 실제 에셋을 표시한다.
- 정확히 일치하는 인물 그림이 없으면 해당 캐릭터의 기본 일러스트를 사용한다.
- 화자가 없는 배경·상황 묘사에 맞는 그림이 없으면 현재 장소의 기본 일러스트를 사용한다.
- 장소 기본 일러스트를 표시할 때는 인물 일러스트를 표시하지 않는다.
- 공개 조건을 충족하지 않은 스포일러 일러스트는 선택 후보에 포함하지 않는다.

### 지도 화면

- 장면의 판정·보상·패널티 정산과 자동 저장이 끝나면 지도 화면으로 복귀한다.
- 한 화면에는 현재 추적 중인 사흉 장소 1개와 미완료 탐험 장소 최대 9개를 표시한다.
- 노드를 선택하면 장소명과 이상 현상 설명을 먼저 보여주고 이동 확인 후 장면에 진입한다.
- 노드가 사흉전인지 탐험·요괴 사건인지는 진입 전 직접 표시하지 않는다.
- 완료한 탐험 노드는 후보·보상 풀에서 제거한다. 사흉 노드는 조우할 때까지 유지한다.
- 지도에서 십이지신 편성·강화, 인벤토리와 기타 보조 메뉴에 접근한다.

### 로그 및 보조 메뉴

- `로그`: 묘사·대사, 선택·자연어 입력, 판정 결과, 획득·성장 기록을 확인한다.
- `십이지신`: 해금·강화 상태와 현재 편성을 확인하고 관리한다.
- `인벤토리`: 보상·패널티 아이템과 공개된 효과를 확인한다.
- `정보`: 수집한 십이지신 이야기와 공개된 고양이 서사를 확인한다.
- `시스템`: 자동 저장 1개, 수동 저장 3개, 불러오기와 설정을 제공한다.
- 숨겨진 카르마, 미공개 정보와 AI 내부 처리 내용은 표시하지 않는다.

### 오류 및 게임 오버 화면

- AI 응답 검증이 연속 실패하면 이전 화면을 유지하고 `다시 시도` 버튼을 표시한다.
- 형식 오류는 판정 실패, 패널티 또는 게임 오버로 취급하지 않는다.
- 게임 오버 화면에는 `최근 자동 저장 불러오기`, `수동 저장 선택`, `타이틀로 이동`을 표시한다.

### 예시 목업

- 승인 검토용: `workspace/projects/chronicles-of-the-twelve-bonds/approvals/assets/visual_novel_ui_mockup_1920x1080_v1.png`
- 승인 후 예정 경로: `workspace/projects/chronicles-of-the-twelve-bonds/design/assets/visual_novel_ui_mockup_1920x1080_v1.png`
- 목업은 화면 구성과 정보 위계 확인용이며 최종 아트·폰트·색상을 확정하지 않는다.

## Gameplay / Production Notes

- 플레이어 경험: 고정 선택지만으로도 진행할 수 있고, 허용 장면에서는 자연어 역할극을 추가로 사용할 수 있다.
- 자원 흐름: 일러스트와 UI는 게임 상태를 표시하며 판정·보상 값을 직접 변경하지 않는다.
- 구현 고려: Unity가 응답 데이터와 등록 ID를 검증한 뒤 화면을 갱신한다.
- QA 고려: 해상도별 스케일링, 긴 한국어 문장, 선택지 개수 변화, 미등록 일러스트와 로그 복귀를 확인한다.

## Open Questions

- TBD: 월드맵의 형태, 지역 구성과 시각적 혼합 기준
- TBD: 실제 사용 폰트, 색상 토큰과 UI 안전 영역
- TBD: 로그 검색·필터와 세부 표시 형식
- TBD: 최초 자연어 입력 장면

## Sources

- `workspace/projects/chronicles-of-the-twelve-bonds/ideas/temporary_ideas.md`의 `IDEA-20260714-001`
- `workspace/projects/chronicles-of-the-twelve-bonds/approvals/assets/visual_novel_ui_mockup_1920x1080_v1.png`

#### Decision History

##### Decision Entry

- 결정: 승인 및 적용
- 결정자: 사용자
- 결정일: 2026-07-15
- 이유: 지금까지 정한 내용을 모두 승인해 확정 문서에 추가하도록 명시함
- 결정 당시 Draft 요약: 1920×1080 비주얼 노벨 UI, 지도·로그·보조 메뉴와 일러스트 표시 규칙

#### Reconfirmation

- 진입 사유:
- 감지일:
- 현재 원본 요약:
- 비교 결과:
- 후속 상태:
- 재확인 결정자:
- 재확인 결정일:
- 재확인 이유:

#### Links

- 관련 결정 로그: `DEC-20260715-001`
- 관련 버전 기록: `VER-20260715-001`
- 근거 파일: `workspace/projects/chronicles-of-the-twelve-bonds/ideas/temporary_ideas.md`
- 상위/대체 승인 항목:

---

### APPR-20260715-002: AI GM 런타임 및 데이터 연동 규칙

#### Metadata

- ID: APPR-20260715-002
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 상태: applied
- 생성일: 2026-07-15
- 요청자: 사용자
- 대상 문서 경로: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`
- 기준 Git 커밋: `32cdfbadd792166066c9dccc268cb9b255d762d0`
- 비교 대상: 신규 문서 제목/주제 `AI GM 런타임 및 데이터 연동 규칙`
- 변경 타입: create
- 관련 workflow: `document_change > create_new_document > write_design_doc`

#### Proposal

AI 게임 마스터, Unity, RAG와 세션 상태의 책임 경계를 개발자가 반복 확인할 수 있는 별도 기술 규칙 문서로 분리한다. 응답 JSON, 검증·재시도, 저장·복원, 자연어 예외 처리, 데이터 필드와 ID 규칙을 포함한다.

#### Review Notes

- 위험도: 높음
- 충돌 가능성: 관련 확정 문서가 없어 직접 충돌은 없음
- 누락 정보: AI 공급자·모델·호출 정책, 세이브 직렬화 형식, 네트워크 오류 정책, 전투·판정 세부 계산은 TBD
- 작성 당시 원본 요약: 없음
- 적용 전 재확인: 2026-07-15 기준 동일 제목·역할의 확정 문서가 없고 기준 Git 커밋이 일치함

#### Draft

# AI GM 런타임 및 데이터 연동 규칙

## Metadata

- 문서 타입: technical
- 상태: confirmed
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/visual_novel_ui.md`
- 마지막 변경: 2026-07-15

## Summary

- Unity를 게임 진행 상태와 규칙 판정의 단일 기준으로 사용한다.
- AI 게임 마스터는 승인된 정보 안에서 묘사·대사·자연어 반응과 일러스트 ID를 생성한다.
- 고정 설정은 RAG, 플레이 중 변하는 값은 Unity 세션 상태로 관리한다.
- AI가 고정 결과, 보상, 성장, 카르마와 엔딩 조건을 임의로 변경하지 못하게 한다.

## Details

### 구성 요소별 책임

| 구성 요소 | 책임 | 금지 사항 |
|---|---|---|
| Unity | 장면 전환, 허용 행동, 판정, Outcome, 상태 변경, 저장·불러오기, 응답 검증, 실제 일러스트 표시 | AI의 서술만 믿고 미검증 상태 변경 |
| AI GM | 감각적 장면 묘사, NPC 대사, 허용된 자연어 행동 반응, 지정 선택지 제시, `illustration_id` 선택 | 플레이어 행동·대사 대신 결정, 규칙·보상·분기 임의 변경 |
| RAG | 시스템 규칙, 세계관, 인물, 장소, 아이템, 장면 참고 자료와 공개 조건 제공 | 카르마·보유 아이템 등 동적 진행 상태 저장 |
| 세션 상태 | 현재 Phase·장면, 선택 이력, 카르마, 성장, 인벤토리, 정보, 사흉·정수 상태와 진행 로그 보관 | 공개 조건을 거치지 않은 정보를 AI에 전달 |

### AI 문맥 구성 우선순위

Unity는 현재 장면에 필요한 최소 정보만 다음 순서로 구성한다.

1. 시스템 규칙과 AI GM 행동 제한
2. 현재 장면의 고정 내용, 허용 선택지와 결과 범위
3. 현재 장면과 관련된 인물·장소·아이템·일러스트 ID
4. 현재 세션 상태와 저장 시점까지의 필요한 로그 요약
5. 공개 조건을 충족한 관련 세계관·서사 정보

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
- `input_mode`: `choice_only` 또는 `choice_and_text`다.
- `choices`: 현재 장면에 허용된 `choice_id`와 표시 문구 목록이다.
- AI는 플레이어의 행동이나 대사를 대신 확정하지 않고 응답 뒤 입력을 기다린다.

### 응답 검증 및 오류 처리

- Unity는 필수 JSON 필드, 타입, 허용 화자, 입력 모드, 현재 장면의 선택지와 등록·공개된 일러스트 ID를 검증한다.
- 검증이 끝나기 전에는 화면과 게임 상태를 변경하지 않는다.
- 첫 검증 실패 시 올바른 형식을 요구하며 한 번 자동 재요청한다.
- 재요청도 실패하면 이전 화면을 유지하고 플레이어에게 `다시 시도`를 제공한다.
- AI 형식 오류를 판정 실패, 패널티 또는 게임 오버로 처리하지 않는다.

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

- `scene_id`, `scene_type`, `location_id`, `input_mode`
- `allowed_choices`, `check_config_id`, `outcomes`, `rag_refs`

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
- 자동 저장은 장면의 판정과 보상·패널티 정산이 모두 끝난 뒤 실행한다.
- 수동 저장은 AI 응답 생성, 판정 또는 전투가 진행 중이지 않은 대기 상태에서만 허용한다.
- 자동 저장 슬롯은 1개, 수동 저장 슬롯은 3개다.
- 불러오기 시 저장 이후 로그와 상태를 제외하고 새 AI 문맥을 구성한다.
- 새 문맥에는 저장된 세션 상태, 저장 시점까지의 로그와 현재 장면에 필요한 RAG만 전달한다.
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
- 지도 노드 `NODE_`, 씬 `SCENE_`, 판정 `CHECK_`, 결과 `OUTCOME_`, RAG `CONTENT_`
- 인물 `CHAR_`, 장소 `LOC_`, 아이템 `ITEM_`, 십이지신 `ZODIAC_`, 사흉 `PERIL_`, 일러스트 `ILL_`
- 예시: `SCENE_SHRINE_PHASE_01`, `ILL_HUNDUN_DEFAULT`

## Gameplay / Production Notes

- 플레이어 경험: 고정 선택지는 언제나 안전한 기본 진행 경로이며 자연어 입력은 허용 장면에서만 추가 자유를 제공한다.
- 자원 흐름: 모든 보상·패널티·성장·정보·카르마 변경은 Unity Outcome을 통해서만 발생한다.
- 구현 고려: AI 요청 전 공개 조건을 검사하고, 응답 검증 완료 전 상태를 변경하지 않는다.
- QA 고려: 잘못된 JSON, 미등록 ID, 네트워크 실패, 로드 후 문맥 재구성, 스포일러 차단과 중복 정산을 확인한다.

## Open Questions

- TBD: AI 공급자, 모델, 요청 제한과 비용 정책
- TBD: 네트워크 시간 초과·오프라인·서비스 장애 처리
- TBD: 세이브 직렬화 형식과 버전 마이그레이션
- TBD: 판정 난수 재현 여부
- TBD: 전투와 판정의 최종 데이터 스키마 및 계산식
- TBD: AI 로그 요약의 길이와 압축 기준

## Sources

- `workspace/projects/chronicles-of-the-twelve-bonds/ideas/temporary_ideas.md`의 `IDEA-20260714-001`

#### Decision History

##### Decision Entry

- 결정: 승인 및 적용
- 결정자: 사용자
- 결정일: 2026-07-15
- 이유: 지금까지 정한 내용을 모두 승인해 확정 문서에 추가하도록 명시함
- 결정 당시 Draft 요약: Unity·AI GM·RAG·세션 상태 책임, 응답 계약, 검증, 저장·복원과 ID 규칙

#### Reconfirmation

- 진입 사유:
- 감지일:
- 현재 원본 요약:
- 비교 결과:
- 후속 상태:
- 재확인 결정자:
- 재확인 결정일:
- 재확인 이유:

#### Links

- 관련 결정 로그: `DEC-20260715-002`
- 관련 버전 기록: `VER-20260715-002`
- 근거 파일: `workspace/projects/chronicles-of-the-twelve-bonds/ideas/temporary_ideas.md`
- 상위/대체 승인 항목:

---

### APPR-20260715-003: 전체 게임 기획서 전환

#### Metadata

- ID: APPR-20260715-003
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 상태: applied
- 생성일: 2026-07-15
- 요청자: 사용자
- 대상 문서 경로: `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`
- 기준 Git 커밋: `32cdfbadd792166066c9dccc268cb9b255d762d0`
- 비교 대상: 신규 문서 제목/주제 `전체 게임 기획서`
- 변경 타입: create
- 관련 workflow: `document_change > draft_design_from_materials > write_design_doc`

#### Proposal

`IDEA-20260714-001`에 남아 있는 프로젝트 방향, 플레이어와 도입부, 핵심 세계관, 혼돈 튜토리얼, 지도·탐험·성장, 전투 1차안, 사흉 진행, 정보·카르마와 엔딩 전체를 확정 게임 기획서로 전환한다. 이미 확정된 UI 및 AI GM 런타임 세부 규칙은 중복하지 않고 관련 문서로 연결한다.

#### Review Notes

- 위험도: 높음
- 충돌 가능성: 동일 제목·역할의 확정 문서는 없으며 기존 UI·기술 문서와는 책임 범위를 나눠 링크함
- 누락 정보: 원본의 미정 사항은 임의로 채우지 않고 `Open Questions`의 TBD로 유지함
- 작성 당시 원본 요약: 없음
- 승인 원본: `workspace/projects/chronicles-of-the-twelve-bonds/ideas/temporary_ideas.md`, SHA-256 `96a3d8ceb6d7fcbb3ebe1a390a24c736e21b266f33e83e2247add758f9a32020`
- 적용 전 재확인: 2026-07-15 기준 동일 제목·역할의 확정 문서가 없고 기존 UI·기술 문서와 직접 충돌하지 않음

#### Draft

- 승인된 범위: `IDEA-20260714-001`에서 UI·기술 확정 문서로 이미 전환한 내용을 제외한 현재 기획 전체
- 포함 항목: 프로젝트 방향, 초보자 접근성, 플레이어·카르마, 세계관·오브젝트, Phase 1~4, 혼돈 튜토리얼, 플레이 루프, 지도·여정, 탐험·성장, 판정 원칙, 전투 1차안, 방향 대응, 정보 수집, 사흉 진행, 최종전·엔딩, 플레이 시간과 다음 재개 지점
- 미정 항목: 원본의 Missing Information을 `TBD`로 보존
- 승인된 전문 반영 경로: `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`

#### Decision History

##### Decision Entry

- 결정: 남은 현재 기획 전체 승인 및 적용
- 결정자: 사용자
- 결정일: 2026-07-15
- 이유: 임시 기획 문서에 남아 있다고 안내받은 현재 내용 전부를 명시적으로 승인함
- 결정 당시 Draft 요약: 시나리오, 사흉 진행, 탐험, 십이지신 성장, 카르마, 정보 수집, 엔딩과 재개 지점의 통합 기획서 전환

#### Reconfirmation

- 진입 사유:
- 감지일:
- 현재 원본 요약:
- 비교 결과:
- 후속 상태:
- 재확인 결정자:
- 재확인 결정일:
- 재확인 이유:

#### Links

- 관련 결정 로그: `DEC-20260715-003`
- 관련 버전 기록: `VER-20260715-003`
- 근거 파일: `workspace/projects/chronicles-of-the-twelve-bonds/ideas/temporary_ideas.md`
- 상위/대체 승인 항목: `APPR-20260715-001`, `APPR-20260715-002`

---

### APPR-20260715-004: 십이인연록 프로젝트 분리 및 생성 규칙 적용

#### Metadata

- ID: APPR-20260715-004
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 상태: applied
- 생성일: 2026-07-15
- 요청자: 사용자
- 대상 문서 경로: `workspace/projects/chronicles-of-the-twelve-bonds/`, `AGENTS.md`, `docs/workflows/project_workspace.md`
- 기준 Git 커밋: `32cdfbadd792166066c9dccc268cb9b255d762d0`
- 비교 대상: 전체 프로젝트 작업 공간 구조와 프로젝트 경로 규칙
- 변경 타입: update
- 관련 workflow: `project_workspace > project migration`

#### Proposal

한국어 프로젝트명 `십이인연록`의 영어명을 `Chronicles of the Twelve Bonds`로 정하고 슬러그 `chronicles-of-the-twelve-bonds` 아래로 모든 게임 고유 자료를 이동한다. 공용 에이전트 규칙과 workflow는 새 프로젝트마다 독립된 Brief, Design, Ideas, Approvals, Decisions와 Versions 구조를 생성하도록 변경한다.

#### Review Notes

- 위험도: 높음
- 충돌 가능성: 등록된 다른 프로젝트가 없어 프로젝트 간 경로 충돌은 없음
- 누락 정보: 없음
- 작성 당시 원본 요약: 게임 자료가 `workspace/design/`, `workspace/ideas/`, `workspace/approvals/`, `workspace/decisions/`, `workspace/versions/`에 단일 프로젝트 전제로 저장됨
- 적용 전 재확인: 2026-07-15 기준 등록 프로젝트가 없고 현재 파일 전체가 십이인연록 한 프로젝트에 속함

#### Draft

- 프로젝트 표시명: `십이인연록`
- 영어명: `Chronicles of the Twelve Bonds`
- 프로젝트 ID와 슬러그: `chronicles-of-the-twelve-bonds`
- 이동 대상: Project Brief, Design, Ideas, Approvals, Decisions, Versions와 관련 에셋 전체
- 새 루트: `workspace/projects/chronicles-of-the-twelve-bonds/`
- 공용 추가 파일: `workspace/project_registry.md`, `docs/workflows/project_workspace.md`, `docs/templates/project_brief.md`
- 규칙 변경: 작업 전 프로젝트 식별, 새 프로젝트 독립 구조 생성, 프로젝트 간 승인·결정·버전·기획 자료 혼합 금지

#### Decision History

##### Decision Entry

- 결정: 승인 및 적용
- 결정자: 사용자
- 결정일: 2026-07-15
- 이유: 십이인연록의 영어 이름을 정해 프로젝트별로 분리하고 새 프로젝트마다 독립 구조를 만들도록 에이전트 규칙 추가를 명시함
- 결정 당시 Draft 요약: 십이인연록 프로젝트 이동과 다중 프로젝트 격리 규칙 도입

#### Reconfirmation

- 진입 사유:
- 감지일:
- 현재 원본 요약:
- 비교 결과:
- 후속 상태:
- 재확인 결정자:
- 재확인 결정일:
- 재확인 이유:

#### Links

- 관련 결정 로그: `DEC-20260715-004`
- 관련 버전 기록: `VER-20260715-004`
- 근거 파일: `AGENTS.md`, `README.md`, `docs/architecture.md`, `workspace/project_registry.md`
- 상위/대체 승인 항목:

## On Hold

보류된 항목이 없다.

## Change Requested

수정 요청된 항목이 없다.

## Rejected

거부된 항목이 없다.
