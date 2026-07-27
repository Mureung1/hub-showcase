# 프롤로그 인게임 스크립트

## Metadata

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 문서 타입: scenario
- 문서 하위 타입: ingame_script
- 상태: confirmed
- 챕터 ID: `CHAPTER_PROLOGUE`[^CW-PROLOGUE-01]
- 작성 범위: Scene 1 `신당 진입과 조우`, Scene 2A `저지 시도와 봉인 파괴`, Scene 2B `관망과 봉인 파괴`, Scene 2C `이탈 시도와 봉인 파괴`, Scene 3 `깨어난 재앙과 오염`, Scene 4 `피리 속 신령과의 계약`
- 상위 시나리오: [메인 시나리오](../main_scenario.md)
- 관련 문서: [세계관 설정](../../world/world_setting.md), [핵심 게임 시스템](../../systems/core_gameplay_systems.md), [플레이 UI](../../ui/gameplay_ui.md), [AI GM 런타임 및 데이터 연동 규칙](../../technical/ai_gm_runtime_rules.md)
- 마지막 변경: 2026-07-27

## Usage

- 플레이어 노출 범위: `Player-Visible Script`의 화자명, 지문·대사, 선택지 문구와 선택 후 Outcome 묘사
- 내부 구현 범위: Scene Data, choice·outcome ID, 조건, 상태·RAG 연결과 Production·QA Notes
- 내부 ID와 각주·출처·조건식·구현 메모는 플레이어 화면에 표시하지 않는다.
- 창작 표시 규칙: 원본에 직접 없는 내용에는 `CW-PROLOGUE-<number>` 각주를 사용한다.
- 구조 변경 표시 규칙: 상위 시나리오 대비 Scene 경계·분기·Outcome 변경에는 `NR-PROLOGUE-<number>`를 사용한다.

## Writer's Brief

- 프로젝트 서사 정체성: 신화가 혼합된 가상 동양 세계에서 이상 현상을 추리하고 십이지신과 인연을 맺는 1인 AI 게임 마스터 TRPG다. 프롤로그는 우연한 목격자가 재앙을 외면할 수 없는 당사자로 바뀌는 순간이다.
- 플레이어에게 약속한 경험: 고정 선택지만으로 진행할 수 있으면서도 개입·관망·이탈의 과거 태도가 기억되고, 재앙 앞에서 접근·도주와 계약·거절을 직접 결정한다.
- 대상 범위의 감정 목표: Scene 1의 결단이 봉인 붕괴를 막지 못했다는 무력감에서 시작해, 거대한 재앙과 오염 앞의 공포를 통과하고 신령의 제안을 받아 책임을 짊어질지 끝내 생존을 택할지 결정하게 한다.
- 극적 질문: 한 번의 선택으로 재앙을 막지 못한 플레이어가, 도망칠 기회가 거듭 주어져도 다시 재앙을 향해 발을 돌리고 인연의 책임을 받아들일 수 있는가.
- 긴장 곡선: Scene 1 선택 결과 → 봉인 파괴와 세 분기의 합류 → 혼돈·오염 발견 → 첫 접근·도주 → 신령의 조건부 반응과 정체 설명 → 힘의 격차 확인 → 피리 제안 → 수락 또는 더 늦은 도주
- 인물별 말투·욕망·서브텍스트:
  - 남성 `방랑도사`: 호탕하고 유쾌한 말투로 위험을 가볍게 받아치는 듯하지만, 직접 근원을 확인하려는 태도를 보인다.
  - 여성 `수련무녀`: 조신하고 신중한 말투로 이상을 관찰하며, 불길한 흐름의 근원을 확인해야 한다는 책임감을 보인다.
  - 흑의인: 봉인 파괴 직후 사라지며 정체와 목적은 비공개로 유지한다.
  - 피리 속 신령: 근엄하지만 봉인 붕괴로 다급하다. Scene 2A 이력이 있으면 플레이어의 의지를 인정해 처음부터 우호적으로 말하고, 다른 이력에서는 사태 수습을 앞세우되 모욕하거나 강요하지 않는다.
  - 혼돈: 말보다 거대한 몸, 느린 움직임과 빠르게 번지는 오염으로 존재를 드러낸다.
  - `narrator`: 신비롭고 장엄한 동양 판타지 어조를 유지하되 짧은 감각 묘사로 선택 압력을 만든다.
- 선택지가 제공할 의도와 체감 차이: Scene 2는 선택 결과의 표현만 달라지고 게임오버 없이 Scene 3으로 합류한다. Scene 3은 정체를 모르는 재앙을 향해 다가갈지 즉시 도주할지, Scene 4는 사태와 대가를 들은 뒤 계약을 수락할지 끝내 거절할지 묻는다. Scene 4 도주는 Scene 3보다 오염이 더 빠르게 덮쳐 선택 시점과 의미를 구분한다.
- 승인된 문체 참고 문서: 본 문서의 기존 확정 플레이어 노출 대본
- 이번 재구성 방향: Scene 1 본문과 분기 ID는 보존한다. Scene 2A·2B·2C는 서로 다른 선택 결과를 짧게 전달한 뒤 같은 핵심 상태로 합류시킨다. Scene 3과 Scene 4의 도주를 모두 유지하고 Scene 4 거절·도주를 별도 게임오버 Outcome으로 추가한다.

## Chapter Summary

- 시작 상태: 플레이어가 선택한 주인공 유형에 맞는 이유로 십이지신당에 진입한다.
- 종료 상태:
  - Scene 3에서 도주하면 오염에 삼켜져 게임 오버가 된다.
  - Scene 4에서 피리를 수락하면 인연의 피리가 현현해 인벤토리에 추가되고 혼돈 보스 전투로 전환된다.
  - Scene 4에서 제안을 거절하고 도주하면 더 빠르게 덮친 오염에 삼켜져 게임 오버가 된다.
- 핵심 사건: 세 Scene 1 선택의 결과, 사흉 봉인 붕괴, 흑의인과 세 사흉의 이탈, 혼돈과 오염, 신령의 조건부 반응, 사흉·십이지 봉인 설명, 힘의 격차, 인연의 피리 제안
- 범위 외: 혼돈 보스전 내부 대본·판정·전투 규칙, 후속 사흉 여정, 신규 게임오버 UI, 실제 registry·asset·item ID 확정

## Scene Index

| 순번 | scene_id | 제목 | input_mode | 진입 조건 | 종료/다음 씬 |
|---|---|---|---|---|---|
| S01[^CW-PROLOGUE-01] | `SCENE_PROLOGUE_01`[^CW-PROLOGUE-01] | 신당 진입과 조우 | `choice_only` | 새 게임 시작 후 주인공 유형 선택 완료[^CW-PROLOGUE-02] | 선택에 따라 `SCENE_PROLOGUE_02A`, `SCENE_PROLOGUE_02B` 또는 `SCENE_PROLOGUE_02C`[^CW-PROLOGUE-01] |
| S02A[^CW-PROLOGUE-07] | `SCENE_PROLOGUE_02A` | 저지 시도와 봉인 파괴 | `narrative_only` | Scene 1 저지 Outcome | Scene 3 |
| S02B[^CW-PROLOGUE-07] | `SCENE_PROLOGUE_02B` | 관망과 봉인 파괴 | `narrative_only` | Scene 1 관망 Outcome | Scene 3 |
| S02C[^CW-PROLOGUE-07] | `SCENE_PROLOGUE_02C` | 이탈 시도와 봉인 파괴 | `narrative_only` | Scene 1 이탈 Outcome | Scene 3 |
| S03[^CW-PROLOGUE-07] | `SCENE_PROLOGUE_03` | 깨어난 재앙과 오염 | `choice_only` | Scene 2A·2B·2C 완료 | 접근 → Scene 4, 도주 → 게임 오버 |
| S04[^CW-PROLOGUE-07] | `SCENE_PROLOGUE_04` | 피리 속 신령과의 계약 | `choice_only` | Scene 3 접근 Outcome | 수락 → 혼돈 보스전 `TBD`, 거절·도주 → 게임 오버 |

## Scene Script

### Scene S01: 신당 진입과 조우[^CW-PROLOGUE-01]

#### Scene Data

- 표시 순번: `S01`[^CW-PROLOGUE-01]
- `scene_id`: `SCENE_PROLOGUE_01`[^CW-PROLOGUE-01]
- `scene_type`: `TBD` — Unity 씬 타입 열거형 확인 필요
- 장면 목적: 주인공 유형별 오프닝 톤을 보여주고 봉인 파괴 의식과 흑의인을 목격시킨 뒤 세 선택지를 제시한다.
- `location_id`: `LOC_ZODIAC_SHRINE_INNER_ALTAR`[^CW-PROLOGUE-01]
- 시간·상태: 봉인 파괴 의식의 마지막 주문이 끝나기 직전
- 등장인물·허용 화자: `narrator`, `CHAR_PLAYER`[^CW-PROLOGUE-01], `CHAR_BLACK_ROBED_INTRUDER`[^CW-PROLOGUE-01]
- 진입 조건: 새 게임에서 남성 `방랑도사` 또는 여성 `수련무녀` 선택을 완료한다.[^CW-PROLOGUE-02]
- 종료 조건: 허용 선택지 셋 중 하나를 선택하고 연결된 Outcome을 확정한다.
- 다음 씬: 저지 선택은 `SCENE_PROLOGUE_02A`, 관망 선택은 `SCENE_PROLOGUE_02B`, 이탈 선택은 `SCENE_PROLOGUE_02C`[^CW-PROLOGUE-01]
- `input_mode`: `choice_only`
- `choice_presentation`: `standard`
- `narrative_tier`: `cinematic`[^CW-PROLOGUE-03]
- `required_memory_refs`: `[]`
- `check_config_id`: 없음
- `rag_refs`: `CONTENT_ZODIAC_SHRINE`, `CONTENT_BLACK_ROBED_INTRUDER`, `CONTENT_PROLOGUE_SEAL_RITUAL`[^CW-PROLOGUE-01]
- `illustration_id`: `TBD` — 승인·등록된 신당 내부 제단 일러스트 ID 필요

#### Player-Visible Script

| line_id | 화자 | 종류 | 플레이어 표시 문구 | 표시 조건 |
|---|---|---|---|---|
| `S01-L001-M`[^CW-PROLOGUE-01] | `narrator` | narration | 사람의 발길이 끊긴 신당 문틈으로 검붉은 기운이 실처럼 새어 나온다.[^CW-PROLOGUE-04] | 남성 `방랑도사` |
| `S01-L002-M`[^CW-PROLOGUE-01] | `CHAR_PLAYER`[^CW-PROLOGUE-01] | dialogue | “허, 술보다 독한 기운이군. 여기까지 불러들였으면 얼굴은 보여 줘야지.”[^CW-PROLOGUE-04] | 남성 `방랑도사` |
| `S01-L001-F`[^CW-PROLOGUE-01] | `narrator` | narration | 순례 내내 좇아온 불길한 흐름이 낡은 신당 안쪽으로 한 줄기처럼 모여든다.[^CW-PROLOGUE-04] | 여성 `수련무녀` |
| `S01-L002-F`[^CW-PROLOGUE-01] | `CHAR_PLAYER`[^CW-PROLOGUE-01] | dialogue | “이렇게 탁한 기운은 처음이야. 근원을 확인해야 해.”[^CW-PROLOGUE-04] | 여성 `수련무녀` |
| `S01-L003`[^CW-PROLOGUE-01] | `narrator` | narration | 이끼와 먼지에 잠긴 회랑을 지나 가장 깊은 제단에 닿자, 검은 옷의 인물이 등을 보인 채 두 손을 들어 올리고 있다.[^CW-PROLOGUE-04] | 공통 |
| `S01-L004`[^CW-PROLOGUE-01] | `narrator` | narration | 알아들을 수 없는 금지된 주문이 낮게 이어질 때마다 제단 위 붉은 균열이 살아 있는 핏줄처럼 번져 간다.[^CW-PROLOGUE-04] | 공통 |
| `S01-L005`[^CW-PROLOGUE-01] | `narrator` | narration | 마지막 주문이 끝나기까지 남은 순간은 길지 않다. 지금 무엇을 할 것인가?[^CW-PROLOGUE-04] | 공통 |

#### Choices / Allowed Actions

| choice/action ID | 플레이어 표시 문구 | 조건 | check_config_id | outcome_id |
|---|---|---|---|---|
| `CHOICE_PROLOGUE_S01_INTERVENE`[^CW-PROLOGUE-01] | 무기를 들고 흑의인을 저지한다. | 항상 | 없음 | `OUTCOME_PROLOGUE_S01_INTERVENE`[^CW-PROLOGUE-01] |
| `CHOICE_PROLOGUE_S01_OBSERVE`[^CW-PROLOGUE-01] | 숨을 죽이고 상황을 지켜본다. | 항상 | 없음 | `OUTCOME_PROLOGUE_S01_OBSERVE`[^CW-PROLOGUE-01] |
| `CHOICE_PROLOGUE_S01_RETREAT`[^CW-PROLOGUE-01] | 불길한 직감을 따라 신전을 빠져나간다. | 항상 | 없음 | `OUTCOME_PROLOGUE_S01_RETREAT`[^CW-PROLOGUE-01] |

#### Outcomes and State

| outcome_id | 확정 결과 | 상태 변화 | 다음 씬 | 공개 정보 |
|---|---|---|---|---|
| `OUTCOME_PROLOGUE_S01_INTERVENE`[^CW-PROLOGUE-01] | 저지를 시도하지만 마지막 주문이 먼저 완성되는 `SCENE_PROLOGUE_02A` 결과로 진행한다. | `FLAG_PROLOGUE_TRIED_TO_STOP_RITUAL = true`[^CW-PROLOGUE-05] | `SCENE_PROLOGUE_02A`[^CW-PROLOGUE-01] | 흑의인을 저지하려 했다는 선택 이력 |
| `OUTCOME_PROLOGUE_S01_OBSERVE`[^CW-PROLOGUE-01] | 방해받지 않은 의식이 완성되는 `SCENE_PROLOGUE_02B` 결과로 진행한다. | 별도 보상·패널티 없음 | `SCENE_PROLOGUE_02B`[^CW-PROLOGUE-01] | 의식을 지켜봤다는 선택 이력 |
| `OUTCOME_PROLOGUE_S01_RETREAT`[^CW-PROLOGUE-01] | 봉인 파괴의 충격파에 휩쓸리는 `SCENE_PROLOGUE_02C` 결과로 진행한다. | 별도 보상·패널티 없음 | `SCENE_PROLOGUE_02C`[^CW-PROLOGUE-01] | 신당을 빠져나가려 했다는 선택 이력 |

#### Information Visibility

- 이 씬에서 공개: 흑의인이 금지된 주술을 사용하며 제단에 붉은 균열이 번지고 있다는 사실
- 계속 비공개: 흑의인의 정체, 고양이와 십이지의 과거, 사흉 정수를 모으는 최종 목적

#### Production Notes

- 배경·일러스트: 먼지와 이끼가 낀 신당 내부에서 붉게 갈라지는 가장 깊은 제단을 중심으로 잡는다.[^CW-PROLOGUE-06]
- BGM: 낮고 지속적인 드론 계열을 사용하고 선택지 표시 직전에 음량을 억제한다.[^CW-PROLOGUE-06]
- 효과음: 낮은 주문 웅얼거림, 돌 제단이 갈라지는 마찰음, 균열이 퍼지는 짧은 파열음을 단계적으로 겹친다.[^CW-PROLOGUE-06]
- 카메라·화면 효과: 제단 원경에서 흑의인의 등 뒤와 붉은 균열로 천천히 좁힌 뒤 선택지 표시 시 카메라를 고정한다.[^CW-PROLOGUE-06]
- 애니메이션: 흑의인의 두 손과 옷자락은 최소 반복 동작, 붉은 균열은 주문 진행에 맞춰 확장한다.[^CW-PROLOGUE-06]
- 기타 리소스: 남녀 오프닝 표시 조건, 신당 배경, 흑의인 후면 실루엣, 붉은 균열 VFX가 필요하다.[^CW-PROLOGUE-06]

#### QA Notes

- 남성·여성 변형은 첫 두 line만 달라지고 공통 line과 세 선택지로 합류하는지 확인한다.
- `choice_only`에서 선택지 세 개가 모두 표시되고 자연어 입력창이 보이지 않는지 확인한다.
- 어떤 선택도 Scene 1에서 판정·보상·패널티를 발생시키지 않는지 확인한다.
- 저지 선택만 `SCENE_PROLOGUE_04`의 신령 우호 반응에 사용할 선택 이력을 남기는지 확인한다.[^CW-PROLOGUE-01]
- 선택 전에는 Outcome, 상태와 다음 씬이 적용되지 않는지 확인한다.
- 세 Outcome의 다음 씬이 각각 `SCENE_PROLOGUE_02A`, `SCENE_PROLOGUE_02B`, `SCENE_PROLOGUE_02C`와 정확히 일치하는지 확인한다.[^CW-PROLOGUE-01]
- 미등록 `illustration_id`를 임의 값으로 대체하지 않고 검증 오류로 처리하는지 확인한다.

### Scene S02A: 저지 시도와 봉인 파괴

#### Scene Data

- 표시 순번: `S02A`[^CW-PROLOGUE-07]
- `scene_id`: `SCENE_PROLOGUE_02A`
- `scene_type`: `TBD`
- 장면 목적: 저지 선택의 행동성과 실패를 전달하고 저지 이력을 보존한 채 Scene 3으로 합류시킨다.
- `location_id`: `LOC_ZODIAC_SHRINE_INNER_ALTAR`[^CW-PROLOGUE-01]
- 시간·상태: 금지된 주술의 마지막 주문이 완성되는 순간
- 등장인물·허용 화자: `narrator`, 흑의인 실제 개체 ID `TBD`
- 진입 조건: `OUTCOME_PROLOGUE_S01_INTERVENE` 확정
- 종료 조건: 고정 결과를 확인하고 `계속`을 입력한다.
- 다음 씬: `SCENE_PROLOGUE_03`
- `input_mode`: `narrative_only`
- `choice_presentation`: `standard`
- `narrative_tier`: `cinematic`[^CW-PROLOGUE-13]
- `continue_outcome_id`: `OUTCOME_PROLOGUE_S02A_CONTINUE`[^CW-PROLOGUE-07]
- `required_memory_refs`: `[]`
- `check_config_id`: 없음
- `rag_refs`: `TBD`
- `illustration_id`: `TBD`

#### Player-Visible Script

| line_id | 화자 | 종류 | 플레이어 표시 문구 | 표시 조건 |
|---|---|---|---|---|
| `S02A-L001`[^CW-PROLOGUE-07] | `narrator` | narration | 무기를 치켜든 순간, 제단 위의 마지막 음절이 먼저 닫힌다.[^CW-PROLOGUE-08] | 진입 |
| `S02A-L002`[^CW-PROLOGUE-07] | `narrator` | narration | 흑의인의 등 뒤에 닿기도 전에 붉은 균열이 한꺼번에 벌어지고, 새어 나오던 기운이 거꾸로 신당 안을 집어삼킨다.[^CW-PROLOGUE-08] | 순차 |
| `S02A-L003`[^CW-PROLOGUE-07] | `narrator` | narration | 무너지는 돌과 검붉은 빛 사이로 흑의인의 형체가 흐려진다. 저지는 늦었지만, 맞서려 했던 뜻만은 남았다.[^CW-PROLOGUE-08] | 순차 |
| `S02A-L004`[^CW-PROLOGUE-07] | `narrator` | narration | 봉인이 끊어지는 울림이 땅속 깊은 곳까지 내려간다.[^CW-PROLOGUE-08] | 순차 |

#### Choices / Allowed Actions

- 없음. `계속` 입력만 허용한다.

#### Outcomes and State

| outcome_id | 확정 결과 | 상태 변화 | 다음 씬 | 공개 정보 |
|---|---|---|---|---|
| `OUTCOME_PROLOGUE_S02A_CONTINUE`[^CW-PROLOGUE-07] | 붕괴 결과를 확정한다. | `FLAG_PROLOGUE_TRIED_TO_STOP_RITUAL = true` 상태를 유지한다.[^CW-PROLOGUE-05] 별도 보상·패널티 없음 | `SCENE_PROLOGUE_03` | 봉인 파괴, 저지 실패 |

#### Information Visibility

- 공개: 마지막 주문이 저지보다 먼저 완성되었고 봉인이 파괴되었다.
- 비공개: 흑의인의 정체·목적, 도주한 사흉의 이름과 목적.

#### Production Notes

- 배경·일러스트: Scene 1 제단 구도를 유지하되 무기 궤적보다 먼저 균열이 완성되는 순간을 강조한다.[^CW-PROLOGUE-14]
- BGM: Scene 1 드론을 끊고 낮은 충격음 뒤 무음 구간을 둔다.[^CW-PROLOGUE-14]
- 효과음: 짧은 무기 풍절음, 주문 종결음, 돌 파열음.[^CW-PROLOGUE-14]
- 카메라·화면 효과: 전진 방향을 짧게 추적한 뒤 붉은 섬광과 화면 흔들림으로 제단 붕괴를 전달한다.[^CW-PROLOGUE-14]
- 애니메이션·기타 리소스: 실제 ID는 `TBD`.

#### QA Notes

- Scene 1 저지 Outcome에서만 진입하는지 확인한다.
- `narrative_only`에서 `계속` 전에는 Outcome이 적용되지 않는지 확인한다.
- 저지 이력이 Scene 4까지 보존되는지 확인한다.
- 보상·패널티·판정·게임오버가 발생하지 않는지 확인한다.
- `계속` 후 반드시 Scene 3으로 이동하는지 확인한다.

### Scene S02B: 관망과 봉인 파괴

#### Scene Data

- 표시 순번: `S02B`[^CW-PROLOGUE-07]
- `scene_id`: `SCENE_PROLOGUE_02B`
- `scene_type`: `TBD`
- 장면 목적: 관망하는 동안 의식이 방해 없이 완성되는 결과를 전달하고 Scene 3으로 합류시킨다.
- `location_id`: `LOC_ZODIAC_SHRINE_INNER_ALTAR`[^CW-PROLOGUE-01]
- 시간·상태: 금지된 의식이 완성되는 순간
- 등장인물·허용 화자: `narrator`, 흑의인 실제 개체 ID `TBD`
- 진입 조건: `OUTCOME_PROLOGUE_S01_OBSERVE` 확정
- 종료 조건: 고정 결과를 확인하고 `계속`을 입력한다.
- 다음 씬: `SCENE_PROLOGUE_03`
- `input_mode`: `narrative_only`
- `choice_presentation`: `standard`
- `narrative_tier`: `cinematic`[^CW-PROLOGUE-13]
- `continue_outcome_id`: `OUTCOME_PROLOGUE_S02B_CONTINUE`[^CW-PROLOGUE-07]
- `required_memory_refs`: `[]`
- `check_config_id`: 없음
- `rag_refs`: `TBD`
- `illustration_id`: `TBD`

#### Player-Visible Script

| line_id | 화자 | 종류 | 플레이어 표시 문구 | 표시 조건 |
|---|---|---|---|---|
| `S02B-L001`[^CW-PROLOGUE-07] | `narrator` | narration | 숨을 죽인 사이, 흑의인의 주문은 한 번도 끊기지 않는다.[^CW-PROLOGUE-09] | 진입 |
| `S02B-L002`[^CW-PROLOGUE-07] | `narrator` | narration | 붉은 균열들이 제단 한가운데서 맞물리고, 오래 버텨 온 돌이 안쪽부터 천천히 갈라진다.[^CW-PROLOGUE-09] | 순차 |
| `S02B-L003`[^CW-PROLOGUE-07] | `narrator` | narration | 지켜보던 순간들이 끝났을 때, 의식 또한 끝나 있다.[^CW-PROLOGUE-09] | 순차 |
| `S02B-L004`[^CW-PROLOGUE-07] | `narrator` | narration | 봉인을 붙들던 기운이 끊어지며 신당 전체가 깊게 가라앉는다.[^CW-PROLOGUE-09] | 순차 |

#### Choices / Allowed Actions

- 없음. `계속` 입력만 허용한다.

#### Outcomes and State

| outcome_id | 확정 결과 | 상태 변화 | 다음 씬 | 공개 정보 |
|---|---|---|---|---|
| `OUTCOME_PROLOGUE_S02B_CONTINUE`[^CW-PROLOGUE-07] | 붕괴 결과를 확정한다. | 별도 보상·패널티 없음 | `SCENE_PROLOGUE_03` | 방해받지 않은 의식 완성, 봉인 파괴 |

#### Information Visibility

- 공개: 관망하는 동안 의식과 봉인 파괴가 완성되었다.
- 비공개: 흑의인의 정체·목적, 사흉의 이름과 목적.

#### Production Notes

- 배경·일러스트: 숨은 시점의 전경에서 흑의인과 제단을 함께 보여준다.[^CW-PROLOGUE-14]
- BGM: 주문의 반복 리듬을 유지하다 봉인 파괴 순간 저역을 크게 확장한다.[^CW-PROLOGUE-14]
- 효과음: 억눌린 숨소리, 주문 반복, 안쪽부터 갈라지는 석재음.[^CW-PROLOGUE-14]
- 카메라·화면 효과: 관찰 시점을 고정하고 균열만 화면 안에서 커지게 한다.[^CW-PROLOGUE-14]
- 애니메이션·기타 리소스: 실제 ID는 `TBD`.

#### QA Notes

- Scene 1 관망 Outcome에서만 진입하는지 확인한다.
- 저지 이력을 생성하거나 변경하지 않는지 확인한다.
- 판정·보상·패널티·게임오버가 없는지 확인한다.
- `계속` 후 Scene 3으로 이동하는지 확인한다.

### Scene S02C: 이탈 시도와 봉인 파괴

#### Scene Data

- 표시 순번: `S02C`[^CW-PROLOGUE-07]
- `scene_id`: `SCENE_PROLOGUE_02C`
- `scene_type`: `TBD`
- 장면 목적: 이탈을 선택한 직후 봉인 파괴의 충격파에 따라잡혀 정신을 잃는 결과를 전달하고 Scene 3으로 합류시킨다.
- `location_id`: `LOC_ZODIAC_SHRINE_INNER_ALTAR`[^CW-PROLOGUE-01]
- 시간·상태: 플레이어가 제단에서 물러나는 순간
- 등장인물·허용 화자: `narrator`
- 진입 조건: `OUTCOME_PROLOGUE_S01_RETREAT` 확정
- 종료 조건: 고정 결과를 확인하고 `계속`을 입력한다.
- 다음 씬: `SCENE_PROLOGUE_03`
- `input_mode`: `narrative_only`
- `choice_presentation`: `standard`
- `narrative_tier`: `cinematic`[^CW-PROLOGUE-13]
- `continue_outcome_id`: `OUTCOME_PROLOGUE_S02C_CONTINUE`[^CW-PROLOGUE-07]
- `required_memory_refs`: `[]`
- `check_config_id`: 없음
- `rag_refs`: `TBD`
- `illustration_id`: `TBD`

#### Player-Visible Script

| line_id | 화자 | 종류 | 플레이어 표시 문구 | 표시 조건 |
|---|---|---|---|---|
| `S02C-L001`[^CW-PROLOGUE-07] | `narrator` | narration | 제단에서 몸을 돌리자, 낡은 회랑 끝에 신당의 출구가 보인다.[^CW-PROLOGUE-10] | 진입 |
| `S02C-L002`[^CW-PROLOGUE-07] | `narrator` | narration | 그러나 두 번째 발을 내딛기도 전에 등 뒤에서 산이 뒤집히는 듯한 굉음이 터진다.[^CW-PROLOGUE-10] | 순차 |
| `S02C-L003`[^CW-PROLOGUE-07] | `narrator` | narration | 붉고 검은 충격파가 먼지와 돌조각을 앞질러 등을 덮친다.[^CW-PROLOGUE-10] | 순차 |
| `S02C-L004`[^CW-PROLOGUE-07] | `narrator` | narration | 바닥과 천장의 경계가 뒤집히고, 신당의 모든 소리가 한순간 멀어진다.[^CW-PROLOGUE-10] | 순차 |
| `S02C-L005`[^CW-PROLOGUE-07] | `narrator` | narration | 정신이 까마득해지기 직전, 봉인이 무너지는 울림만이 뼛속에 남는다.[^CW-PROLOGUE-10] | 순차 |

#### Choices / Allowed Actions

- 없음. `계속` 입력만 허용한다.

#### Outcomes and State

| outcome_id | 확정 결과 | 상태 변화 | 다음 씬 | 공개 정보 |
|---|---|---|---|---|
| `OUTCOME_PROLOGUE_S02C_CONTINUE`[^CW-PROLOGUE-07] | 충격파에 휩쓸려 정신을 잃은 결과를 확정한다. | 별도 보상·패널티 없음 | `SCENE_PROLOGUE_03` | 봉인 파괴의 충격파 |

#### Information Visibility

- 공개: 이탈을 시도했지만 봉인 파괴의 충격파를 피하지 못했다.
- 비공개: 흑의인의 행방과 사흉의 정체.

#### Production Notes

- 배경·일러스트: 제단 반대편 회랑과 출구를 짧게 보여준 뒤 충격파가 뒤에서 덮치게 한다.[^CW-PROLOGUE-14]
- BGM: 이탈 순간 저역을 줄였다가 충격파와 함께 끊는다.[^CW-PROLOGUE-14]
- 효과음: 급한 발소리, 후방 굉음, 돌 파편, 이명.[^CW-PROLOGUE-14]
- 카메라·화면 효과: 출구 방향 이동 후 후방 섬광, 강한 흔들림, 암전.[^CW-PROLOGUE-14]
- 애니메이션·기타 리소스: 실제 ID는 `TBD`.

#### QA Notes

- Scene 1 이탈 Outcome에서만 진입하는지 확인한다.
- 이 Scene에서는 게임오버를 호출하지 않는지 확인한다.
- 별도 피해·패널티·판정을 만들지 않는지 확인한다.
- `계속` 후 Scene 3의 Scene 2C 전용 기상 문구로 연결되는지 확인한다.

### Scene S03: 깨어난 재앙과 오염

#### Scene Data

- 표시 순번: `S03`[^CW-PROLOGUE-07]
- `scene_id`: `SCENE_PROLOGUE_03`
- `scene_type`: `TBD`
- 장면 목적: 세 분기를 동일한 재앙 상태로 합류시키고 혼돈·오염을 보여준 뒤 접근 또는 즉시 도주를 선택하게 한다.
- `location_id`: `LOC_ZODIAC_SHRINE_INNER_ALTAR`[^CW-PROLOGUE-01]
- 시간·상태: 봉인이 파괴된 직후
- 등장인물·허용 화자: `narrator`, 혼돈 실제 개체 ID `TBD`
- 진입 조건: Scene 2A·2B·2C 중 하나의 continue Outcome 확정
- 종료 조건: 접근 또는 도주 선택의 Outcome 확정
- 다음 씬: 접근은 `SCENE_PROLOGUE_04`, 도주는 기존 게임오버 UI
- `input_mode`: `choice_only`
- `choice_presentation`: `emphasis`[^CW-PROLOGUE-13]
- `narrative_tier`: `cinematic`[^CW-PROLOGUE-13]
- `required_memory_refs`: `[]`
- `check_config_id`: 없음
- `rag_refs`: `TBD`
- `illustration_id`: `TBD`

#### Player-Visible Script

| line_id | 화자 | 종류 | 플레이어 표시 문구 | 표시 조건 |
|---|---|---|---|---|
| `S03-L001-A`[^CW-PROLOGUE-07] | `narrator` | narration | 귀를 메운 울림이 잦아들자 무너진 제단이 다시 시야에 들어온다.[^CW-PROLOGUE-11] | Scene 2A·2B 경유 |
| `S03-L001-C`[^CW-PROLOGUE-07] | `narrator` | narration | 차가운 돌바닥 위에서 눈을 뜨자 무너진 제단이 기울어진 채 시야를 가득 채운다.[^CW-PROLOGUE-11] | Scene 2C 경유 |
| `S03-L002`[^CW-PROLOGUE-07] | `narrator` | narration | 흑의인은 흔적도 없이 사라졌고, 무너진 신당 너머로 세 개의 흉한 기척이 서로 다른 방향으로 멀어진다.[^CW-PROLOGUE-11] | 공통 |
| `S03-L003`[^CW-PROLOGUE-07] | `narrator` | narration | 제단 한가운데에는 산처럼 거대한 형체 하나만이 남아 있다.[^CW-PROLOGUE-11] | 공통 |
| `S03-L004`[^CW-PROLOGUE-07] | `narrator` | narration | 그것이 발을 옮길 때마다 바닥의 이끼가 검게 마르고, 돌 틈에서 번진 어둠이 살아 있는 것처럼 사방으로 뻗는다.[^CW-PROLOGUE-11] | 공통 |
| `S03-L005`[^CW-PROLOGUE-07] | `narrator` | narration | 출구는 아직 보인다. 하지만 검은 오염도 발끝 가까이 다가오고 있다.[^CW-PROLOGUE-11] | 선택지 직전 |
| `S03-L006`[^CW-PROLOGUE-07] | `narrator` | narration | 재앙의 정체를 확인하기 위해 다가갈 것인가, 지금 신당을 벗어날 것인가?[^CW-PROLOGUE-11] | 선택지 직전 |
| `S03-L007`[^CW-PROLOGUE-07] | `narrator` | narration | 신당 밖을 향해 몸을 돌린 순간, 검은 흔적들이 한꺼번에 발밑으로 모여든다.[^CW-PROLOGUE-11] | 도주 Outcome |
| `S03-L008`[^CW-PROLOGUE-07] | `narrator` | narration | 문턱은 몇 걸음 앞에 있는데도 다리는 물속에 잠긴 듯 무거워진다. 시든 이끼의 검음이 발목을 지나 숨결까지 타고 오른다.[^CW-PROLOGUE-11] | 도주 Outcome |
| `S03-L009`[^CW-PROLOGUE-07] | `narrator` | narration | 마지막 빛이 닿기 전에, 신당과 몸의 감각이 함께 검은 오염 속으로 가라앉는다.[^CW-PROLOGUE-11] | 도주 Outcome |

#### Choices / Allowed Actions

| choice/action ID | 플레이어 표시 문구 | 조건 | check_config_id | outcome_id |
|---|---|---|---|---|
| `CHOICE_PROLOGUE_S03_APPROACH`[^CW-PROLOGUE-07] | 거대한 재앙에게 접근해 정체를 확인한다. | 항상 | 없음 | `OUTCOME_PROLOGUE_S03_APPROACH`[^CW-PROLOGUE-07] |
| `CHOICE_PROLOGUE_S03_FLEE`[^CW-PROLOGUE-07] | 신당 밖으로 도망친다. | 항상 | 없음 | `OUTCOME_PROLOGUE_S03_FLEE_GAME_OVER`[^CW-PROLOGUE-07] |

#### Outcomes and State

| outcome_id | 확정 결과 | 상태 변화 | 다음 씬 | 공개 정보 |
|---|---|---|---|---|
| `OUTCOME_PROLOGUE_S03_APPROACH`[^CW-PROLOGUE-07] | 재앙 곁으로 접근한다. | 별도 보상·패널티 없음 | `SCENE_PROLOGUE_04` | 오염을 퍼뜨리는 거대한 재앙 |
| `OUTCOME_PROLOGUE_S03_FLEE_GAME_OVER`[^CW-PROLOGUE-07] | `S03-L007`~`S03-L009`를 표시한 뒤 기존 게임오버로 전환한다. | 현재 자동 저장을 덮어쓰지 않는다. 실제 상태 키는 `TBD`.[^CW-PROLOGUE-15] | 기존 게임오버 UI | 오염에 휩쓸린 결과 |

#### Information Visibility

- 공개: 흑의인이 사라졌고 세 흉한 기척이 도주했으며 거대한 재앙이 검은 오염을 퍼뜨린다.
- 비공개: 거대한 재앙과 세 기척의 이름, 흑의인의 정체와 목적.

#### Production Notes

- 배경·일러스트: 붕괴한 제단, 원경의 혼돈 실루엣, 바닥을 따라 번지는 오염을 한 구도에서 보여준다.[^CW-PROLOGUE-14]
- BGM: 저역의 느린 박동과 끊어진 제의음 잔향.[^CW-PROLOGUE-14]
- 효과음: 무거운 발걸음, 식물이 마르는 소리, 바닥을 기는 오염음.[^CW-PROLOGUE-14]
- 카메라·화면 효과: 혼돈의 전신을 완전히 밝히지 않고 발과 오염에서 상체 실루엣으로 천천히 올린다.[^CW-PROLOGUE-14]
- 도주 Outcome: 오염이 발목에서 화면 가장자리로 번지고 완전 암전 뒤 기존 게임오버 UI로 전환한다.[^CW-PROLOGUE-14]
- 애니메이션·기타 리소스: 실제 ID는 `TBD`.

#### QA Notes

- Scene 2A·2B는 `S03-L001-A`, Scene 2C는 `S03-L001-C`만 표시한 뒤 공통 line으로 합류하는지 확인한다.
- 흑의인과 세 사흉의 이름·목적을 조기 노출하지 않는지 확인한다.
- `choice_only + emphasis`에서 정확히 두 선택지가 표시되는지 확인한다.
- 접근 선택은 Scene 4로, 도주 선택은 전용 line 표시 뒤 기존 게임오버 UI로 이동하는지 확인한다.
- 게임오버가 현재 자동 저장을 덮어쓰지 않는지 확인한다.

### Scene S04: 피리 속 신령과의 계약

#### Scene Data

- 표시 순번: `S04`[^CW-PROLOGUE-07]
- `scene_id`: `SCENE_PROLOGUE_04`
- `scene_type`: `TBD`
- 장면 목적: 선택 이력에 따라 신령의 첫 반응을 달리하고 혼돈·사흉·봉인 붕괴와 힘의 격차를 설명한 뒤 피리 수락 또는 거절·도주를 선택하게 한다.
- `location_id`: `LOC_ZODIAC_SHRINE_INNER_ALTAR`[^CW-PROLOGUE-01]
- 시간·상태: Scene 3에서 혼돈에게 접근한 직후
- 등장인물·허용 화자: `narrator`, 신령 표시명 `신령`, 실제 신령·혼돈 ID `TBD`
- 진입 조건: `OUTCOME_PROLOGUE_S03_APPROACH` 확정
- 종료 조건: 피리 수락 또는 거절·도주 Outcome 확정
- 다음 씬: 수락은 혼돈 보스전 Scene ID `TBD`, 거절·도주는 기존 게임오버 UI
- `input_mode`: `choice_only`
- `choice_presentation`: `emphasis`[^CW-PROLOGUE-13]
- `narrative_tier`: `cinematic`[^CW-PROLOGUE-13]
- `required_memory_refs`: `[]`
- `check_config_id`: 없음
- `rag_refs`: `TBD`
- `illustration_id`: `TBD`

#### Player-Visible Script

| line_id | 화자 | 종류 | 플레이어 표시 문구 | 표시 조건 |
|---|---|---|---|---|
| `S04-L001-A`[^CW-PROLOGUE-07] | 신령 | dialogue | “봉인을 지키려 몸을 던진 자여. 그 뜻은 이미 보았다.”[^CW-PROLOGUE-12] | `FLAG_PROLOGUE_TRIED_TO_STOP_RITUAL = true` |
| `S04-L001-BC`[^CW-PROLOGUE-07] | 신령 | dialogue | “마침내 재앙을 향해 발을 돌렸구나. 늦었으나, 아직 끝난 것은 아니다.”[^CW-PROLOGUE-12] | 저지 이력 없음 |
| `S04-L002`[^CW-PROLOGUE-07] | `narrator` | narration | 모습 없는 목소리가 귓가가 아니라 머릿속 깊은 곳에서 울린다.[^CW-PROLOGUE-12] | 공통 |
| `S04-L003`[^CW-PROLOGUE-07] | 신령 | dialogue | “나는 인연의 피리에 깃든 신령이다. 네 앞의 재앙은 사흉 가운데 하나, 혼돈.”[^CW-PROLOGUE-12] | 공통 |
| `S04-L004`[^CW-PROLOGUE-07] | 신령 | dialogue | “십이지신이 붙들던 봉인은 무너졌다. 궁기와 도올, 도철은 이미 신당을 벗어났고, 혼돈만이 이곳에 남아 오염을 퍼뜨리고 있다.”[^CW-PROLOGUE-12] | 공통 |
| `S04-L005`[^CW-PROLOGUE-07] | `narrator` | narration | 혼돈이 발을 들어 올리는 것만으로 숨이 조여 온다. 검은 오염 앞에서 홀로 맞설 수 없는 힘의 격차가 선명해진다.[^CW-PROLOGUE-12] | 공통 |
| `S04-L006`[^CW-PROLOGUE-07] | 신령 | dialogue | “기백만으로 저것을 막을 수는 없다. 나와 인연을 맺고 피리를 받으라. 십이지의 편린을 다룰 권능을 빌려주겠다.”[^CW-PROLOGUE-12] | 공통 |
| `S04-L007`[^CW-PROLOGUE-07] | 신령 | dialogue | “피리는 봉인과 함께 상했다. 지금 응답할 수 있는 것은 원숭이와 닭, 개뿐이다. 그러나 혼돈을 상대하기에는 충분하다.”[^CW-PROLOGUE-12] | 공통 |
| `S04-L008`[^CW-PROLOGUE-07] | `narrator` | narration | 검은 오염이 원을 좁혀 오는 가운데, 보이지 않는 신령이 대답을 기다린다.[^CW-PROLOGUE-12] | 선택지 직전 |
| `S04-L009-ACCEPT`[^CW-PROLOGUE-07] | `narrator` | narration | 수락의 뜻을 정하는 순간, 허공에 흩어져 있던 빛이 한곳으로 모인다.[^CW-PROLOGUE-12] | 수락 Outcome |
| `S04-L010-ACCEPT`[^CW-PROLOGUE-07] | `narrator` | narration | 금이 간 인연의 피리가 눈앞에 현현하고, 따뜻한 울림과 함께 손안으로 내려앉는다.[^CW-PROLOGUE-12] | 수락 Outcome |
| `S04-L011-ACCEPT`[^CW-PROLOGUE-07] | 신령 | dialogue | “피리를 들라. 세 인연이 그대의 부름을 기다리고 있다.”[^CW-PROLOGUE-12] | 수락 Outcome |
| `S04-L009-REFUSE`[^CW-PROLOGUE-07] | `narrator` | narration | 제안을 거절하고 돌아서는 순간, 발밑의 검음이 기다렸다는 듯 치솟는다.[^CW-PROLOGUE-12] | 거절·도주 Outcome |
| `S04-L010-REFUSE`[^CW-PROLOGUE-07] | 신령 | dialogue | “멈춰라. 이번에는—”[^CW-PROLOGUE-12] | 거절·도주 Outcome |
| `S04-L011-REFUSE`[^CW-PROLOGUE-07] | `narrator` | narration | 경고가 끝나기도 전에 오염이 그림자보다 먼저 앞을 막는다. 한 걸음조차 떼기 전에 검은 기운이 온몸을 휘감는다.[^CW-PROLOGUE-12] | 거절·도주 Outcome |
| `S04-L012-REFUSE`[^CW-PROLOGUE-07] | `narrator` | narration | 숨을 들이쉴 틈도 없이 빛과 소리가 꺼지고, 신당은 완전한 어둠 속으로 가라앉는다.[^CW-PROLOGUE-12] | 거절·도주 Outcome |

#### Choices / Allowed Actions

| choice/action ID | 플레이어 표시 문구 | 조건 | check_config_id | outcome_id |
|---|---|---|---|---|
| `CHOICE_PROLOGUE_S04_ACCEPT_FLUTE`[^CW-PROLOGUE-07] | 신령의 제안을 받아들이고 피리를 받는다. | 항상 | 없음 | `OUTCOME_PROLOGUE_S04_ACCEPT_FLUTE`[^CW-PROLOGUE-07] |
| `CHOICE_PROLOGUE_S04_REFUSE_AND_FLEE`[^CW-PROLOGUE-07] | 제안을 거절하고 돌아서 도망친다. | 항상 | 없음 | `OUTCOME_PROLOGUE_S04_REFUSE_AND_FLEE_GAME_OVER`[^CW-PROLOGUE-07] |

#### Outcomes and State

| outcome_id | 확정 결과 | 상태 변화 | 다음 씬·화면 | 공개 정보 |
|---|---|---|---|---|
| `OUTCOME_PROLOGUE_S04_ACCEPT_FLUTE`[^CW-PROLOGUE-07] | `S04-L009-ACCEPT`~`S04-L011-ACCEPT`를 순서대로 표시한다. | 인연의 피리 현현·수령·인벤토리 추가. 실제 `ITEM_` ID와 상태 키는 `TBD`.[^CW-PROLOGUE-15] | 혼돈 보스전 Scene ID `TBD` | 피리 수령, 원숭이·닭·개 사용 가능 |
| `OUTCOME_PROLOGUE_S04_REFUSE_AND_FLEE_GAME_OVER`[^CW-PROLOGUE-07] | `S04-L009-REFUSE`~`S04-L012-REFUSE`를 순서대로 표시한 뒤 기존 게임오버를 호출한다. | 현재 자동 저장을 덮어쓰지 않는다. 실제 호출 계약과 상태 키는 `TBD`.[^CW-PROLOGUE-15] | 기존 게임오버 UI | 더 빠른 오염에 휩쓸린 결과 |

#### Information Visibility

- 공개: 목소리의 주인이 인연의 피리에 깃든 신령이라는 사실, 눈앞의 재앙이 혼돈이라는 사실, 궁기·도올·도철의 도주, 십이지신 봉인의 붕괴, 피리의 역할과 원숭이·닭·개만 사용할 수 있다는 사실.
- 비공개: 흑의인의 정체·목적, 고양이와 십이지의 과거, 후반 엔딩 조건과 숨겨진 카르마.

#### Production Notes

- 배경·일러스트: 혼돈과 오염을 배경에 유지하고 신령은 모습 없이 음성과 화면 중심의 미세한 빛으로만 표현한다.[^CW-PROLOGUE-14]
- BGM: 신령 등장 시 기존 저역 위에 얇은 관악 음색을 겹치고 최종 선택지에서는 지속음을 낮춘다.[^CW-PROLOGUE-14]
- 효과음: 머릿속 울림, 오염 접근음, 수락 시 짧은 피리 공명, 거절 시 급격히 치솟는 오염음.[^CW-PROLOGUE-14]
- 카메라·화면 효과: 수락 시 피리 현현으로 초점을 옮기고, 거절 시 오염이 Scene 3보다 빠르게 화면을 덮는다.[^CW-PROLOGUE-14]
- 애니메이션·기타 리소스: 실제 ID는 `TBD`.

#### QA Notes

- Scene 2A 이력이 있을 때만 `S04-L001-A`가 표시되고 다른 경로에서는 `S04-L001-BC`가 표시되는지 확인한다.
- 조건부 첫 반응 이후 모든 경로가 `S04-L002`로 합류하는지 확인한다.
- 최종 입력 전에는 피리 현현·인벤토리 추가·게임오버가 발생하지 않는지 확인한다.
- `CHOICE_PROLOGUE_S04_ACCEPT_FLUTE`가 정확히 `OUTCOME_PROLOGUE_S04_ACCEPT_FLUTE`를 호출하고 수락 line만 표시하는지 확인한다.
- 수락 Outcome에서 피리를 한 번만 추가하고 보스 Scene ID가 `TBD`인 동안 임의 Scene으로 전환하지 않는지 확인한다.
- `CHOICE_PROLOGUE_S04_REFUSE_AND_FLEE`가 정확히 `OUTCOME_PROLOGUE_S04_REFUSE_AND_FLEE_GAME_OVER`를 호출하고 거절 line만 표시하는지 확인한다.
- Scene 4의 오염이 Scene 3 도주보다 빠르게 덮치며 기존 게임오버 UI와 autosave 미덮어쓰기 규칙을 사용하는지 확인한다.

## Open Questions / TBD

- TBD: Unity가 사용할 실제 `scene_type` 값
- TBD: 주인공·흑의인·신령·혼돈·신당·피리·RAG 연결 ID의 실제 등록값
- TBD: Scene 1·2A·2B·2C·3·4의 실제 `illustration_id`
- TBD: 인연의 피리 실제 `ITEM_` ID와 인벤토리 상태 키
- TBD: 수락 후 진입할 confirmed 혼돈 보스전 내부 Scene ID
- TBD: 혼돈 보스전 내부 플레이어 대본·판정·전투 규칙
- TBD: 실제 게임오버 상태 키와 호출 계약
- TBD: 한 화면 글자 수와 line 자동·수동 진행 규칙
- TBD: BGM·효과음·카메라·VFX·animation 리소스 ID와 제작 가능 범위

## High-Risk Dependencies

- 없음. 2026-07-27 사용자 확인 결과 기존 Scene ID를 사용하는 실제 Unity·RAG·content registry, 참조 또는 세이브 데이터가 없어 ID migration은 필요하지 않다.
- 새 line·choice·outcome ID와 아직 미등록인 실제 구현 ID는 향후 registry와 데이터를 만들 때 본 문서 및 [AI GM 런타임 및 데이터 연동 규칙](../../technical/ai_gm_runtime_rules.md)의 명명 규칙에 맞춰 등록한다.

## Creative Footnotes

[^CW-PROLOGUE-01]: 대상 ID/필드는 `CHAPTER_PROLOGUE`; 표시·Scene ID `S01`, `SCENE_PROLOGUE_01`, `SCENE_PROLOGUE_02A`, `SCENE_PROLOGUE_02B`, `SCENE_PROLOGUE_02C`, `SCENE_PROLOGUE_03`, `SCENE_PROLOGUE_04`; line ID `S01-L001-M`, `S01-L002-M`, `S01-L001-F`, `S01-L002-F`, `S01-L003`, `S01-L004`, `S01-L005`; choice ID `CHOICE_PROLOGUE_S01_INTERVENE`, `CHOICE_PROLOGUE_S01_OBSERVE`, `CHOICE_PROLOGUE_S01_RETREAT`; outcome ID `OUTCOME_PROLOGUE_S01_INTERVENE`, `OUTCOME_PROLOGUE_S01_OBSERVE`, `OUTCOME_PROLOGUE_S01_RETREAT`; 유지되는 구현 ID `CHAR_PLAYER`, `CHAR_BLACK_ROBED_INTRUDER`, `LOC_ZODIAC_SHRINE_INNER_ALTAR`, `CONTENT_ZODIAC_SHRINE`, `CONTENT_BLACK_ROBED_INTRUDER`, `CONTENT_PROLOGUE_SEAL_RITUAL`이다. 표시·Scene·line·choice·outcome 이름과 분기 매핑은 사용자 선택으로 확정했다. 2026-07-27 사용자 확인 결과 기존 ID를 사용하는 실제 registry·참조·세이브 데이터는 없어 migration은 필요하지 않다. Scene 1의 설정·사건·Outcome과 상태 규칙은 유지하며 Scene 2A~4의 새 대본·구현 ID는 `CW-PROLOGUE-07`~`15`에서 공개한다.
[^CW-PROLOGUE-02]: 새 게임의 주인공 유형 선택 완료를 진입 조건으로 표현한 것은 성별 선택과 오프닝 변형을 데이터 조건으로 연결하기 위한 창작이다. 새 사건은 추가하지 않지만 캐릭터 생성 흐름과 실제 연결 방식은 UI·기술 구현 확인이 필요하다.
[^CW-PROLOGUE-03]: `narrative_tier: cinematic`은 봉인 붕괴 직전 장면의 연출 밀도를 높이기 위한 창작 제안이다. 서사 결과는 바꾸지 않지만 선택형 서술가 호출 여부와 응답 시간 예산에 영향을 준다.
[^CW-PROLOGUE-04]: `S01-L001-M`부터 `S01-L005`까지의 구체적인 문장과 남녀 독백은 원본의 주인공 톤, 신당 상태, 흑의인의 의식과 붉은 균열만 근거로 작성한 플레이어 노출 대본이다. 이번 재구성에서는 문구를 변경하지 않았다.
[^CW-PROLOGUE-05]: `FLAG_PROLOGUE_TRIED_TO_STOP_RITUAL`은 `SCENE_PROLOGUE_04`에서 신령이 용기를 알아보고 우호적으로 반응한다는 확정 결과를 저장하기 위한 창작 상태 표현이다. 보상·수치 효과는 없지만 세션 상태 스키마와 Scene 4 조건이 같은 키를 사용해야 한다.
[^CW-PROLOGUE-06]: 배경 구도, BGM, 효과음, 카메라, 애니메이션과 리소스 요구는 원본에 없는 제작 연출 제안이다. 스토리·규칙은 바꾸지 않지만 에셋 제작 범위와 장면 구현 비용에 영향을 주므로 실제 리소스 ID와 제작 가능성을 별도 확인해야 한다.
[^CW-PROLOGUE-07]: 표시 순번 `S02A`, `S02B`, `S02C`, `S03`, `S04`; 해당 Scene의 line ID; choice ID `CHOICE_PROLOGUE_S03_APPROACH`, `CHOICE_PROLOGUE_S03_FLEE`, `CHOICE_PROLOGUE_S04_ACCEPT_FLUTE`, `CHOICE_PROLOGUE_S04_REFUSE_AND_FLEE`; outcome ID `OUTCOME_PROLOGUE_S02A_CONTINUE`, `OUTCOME_PROLOGUE_S02B_CONTINUE`, `OUTCOME_PROLOGUE_S02C_CONTINUE`, `OUTCOME_PROLOGUE_S03_APPROACH`, `OUTCOME_PROLOGUE_S03_FLEE_GAME_OVER`, `OUTCOME_PROLOGUE_S04_ACCEPT_FLUTE`, `OUTCOME_PROLOGUE_S04_REFUSE_AND_FLEE_GAME_OVER`는 상위 시나리오에 없는 구현 연결 ID 제안이다. 기존 실제 registry 데이터는 없으며 향후 등록 시 문서·Unity·QA 참조를 같은 값으로 맞춰야 한다.
[^CW-PROLOGUE-08]: `S02A-L001`~`S02A-L004`는 저지보다 주문이 먼저 완성되는 사건을 행동 직후의 감각과 붕괴로 장면화한다. 정사·결과는 바꾸지 않는다.
[^CW-PROLOGUE-09]: `S02B-L001`~`S02B-L004`는 방해받지 않은 의식 완성과 제단 붕괴의 인과를 관망 선택의 시간 흐름으로 장면화한다. 보상·패널티·추가 정보는 없다.
[^CW-PROLOGUE-10]: `S02C-L001`~`S02C-L005`는 출구가 보인 뒤 충격파가 따라잡아 플레이어가 정신을 잃는 결과를 장면화한다. `S02C-L005`는 봉인 의식 중단으로 오독되지 않도록 `정신이 까마득해지기 직전`으로 명확화했다. 게임오버·피해 상태는 추가하지 않는다.
[^CW-PROLOGUE-11]: `S03-L001-A`, `S03-L001-C`, `S03-L002`~`S03-L009`는 세 분기의 합류와 도주 게임오버 직전 감각을 장면화한다. 게임오버 UI·저장 규칙은 바꾸지 않는다.
[^CW-PROLOGUE-12]: `S04-L001-A`, `S04-L001-BC`, `S04-L002`~`S04-L012-REFUSE`는 조건부 신령 반응, 설명, 피리 제안, 수락과 거절·도주 결과를 구체 대사·연출로 작성한다. 거절 게임오버는 `NR-PROLOGUE-02`에 의존한다.
[^CW-PROLOGUE-13]: Scene 2A·2B·2C·3·4의 `narrative_tier: cinematic`과 Scene 3·4의 `choice_presentation: emphasis`는 허용된 UI·기술 값 중 연출 밀도와 선택 가독성을 위한 제안이다. 자동 확정·자연어 입력은 추가하지 않는다.
[^CW-PROLOGUE-14]: Scene 2A·2B·2C·3·4의 배경·BGM·효과음·카메라·VFX·animation Production Notes는 세 결과와 두 오염 속도를 구분하기 위한 제작 제안이다. 실제 리소스 ID는 모두 `TBD`다.
[^CW-PROLOGUE-15]: 두 게임오버 Outcome의 호출·저장 표현과 피리 수락 Outcome의 인벤토리 표현은 확정된 결과를 구현 필드로 드러낸 것이다. 실제 item·state·call 키는 `TBD`로 유지한다.

## Narrative Revision Log

| revision_id | 원본 경로·섹션 | 원본 구조 | 작성본 구조 | 변경 이유 | 기대 플레이 경험 | 연속성·후속 영향 | 승인 후 동기화 대상 |
|---|---|---|---|---|---|---|---|
| `NR-PROLOGUE-01` | `design/narrative/main_scenario.md`의 `Prologue` 기존 Phase 1~4 및 본 문서 전체 | 상위 시나리오는 신당 진입·선택, 세 선택 결과, 혼돈·오염, 신령 계약을 네 Phase로 구분하고 본 문서는 Phase 1의 선택 뒤 선택별 Phase 2 결과 씬을 참조했다. | 선택 입력 대기 지점을 `SCENE_PROLOGUE_01`로 두고 세 선택의 단일 결과 전달 지점을 `SCENE_PROLOGUE_02A`·`02B`·`02C`로 분리한다. 이후 혼돈·오염과 신령 계약은 각각 `SCENE_PROLOGUE_03`, `SCENE_PROLOGUE_04`로 연결한다. 본 문서는 Scene 1 대본과 세 분기 참조만 작성한다. | 하나의 입력 대기 또는 하나의 확정 결과 전달 단위를 한 Scene으로 삼는 작성·구현 규칙과 사용자 지정 경계를 일치시키기 위해서다. | 선택 순간과 결과 전달이 분리되어 플레이어 입력 전 상태 변경을 방지하고, 세 선택이 어떤 결과 Scene으로 이어지는지 명확하게 체감·검증할 수 있다. | 사건 순서, 공개 시점, 선택 문구, Outcome, 보상·패널티와 동기는 변하지 않는다. 저지 선택 이력은 `SCENE_PROLOGUE_04`까지 유지하며 후속 `02A`~`04`의 플레이어 대본은 계속 TBD다. | `design/narrative/main_scenario.md`, `design/narrative/scripts/prologue_ingame_script.md`, `design/game/game_design_overview.md`의 프롤로그 Scene 설명 |
| `NR-PROLOGUE-02` | 메인 시나리오 Scene 4, 본 문서 Metadata·Summary·TBD, 게임 개요와 두 색인의 프롤로그 범위 | Scene 4는 피리 수락 후 보스전으로만 끝나며 본 문서와 네 owner/index 표기는 Scene 1만 확정 범위로 둔다. | 힘의 격차 뒤 피리를 제안하고 수락은 `OUTCOME_PROLOGUE_S04_ACCEPT_FLUTE`, 거절·도주는 `OUTCOME_PROLOGUE_S04_REFUSE_AND_FLEE_GAME_OVER`로 연결한다. 본 문서 범위는 Scene 1·2A·2B·2C·3·4 전체다. | 계약을 실제 선택으로 만들고 두 도주의 시점과 의미를 구분하며 모든 owner/index 범위를 일치시키기 위해서다. | 수락은 책임을 짊어지는 결단이 되고 거절은 더 빠른 오염으로 끝난다. 보스전 규칙과 새 엔딩은 추가하지 않는다. | 본 문서, `main_scenario.md`, `game_design_overview.md`, 프로젝트 `README.md`, `design/README.md`를 하나의 `restructure`로 원자적으로 동기화한다. |

## Sources

- 현재 사용자 입력: Scene 2A·2B·2C는 게임오버 없이 설명만 달라진 뒤 Scene 3으로 합류한다. Scene 3과 Scene 4의 도주 게임오버를 모두 유지한다. Scene 4에서 피리를 수락하면 혼돈전으로, 거절하고 도주하면 더 빠른 오염에 휩쓸려 게임오버로 이어진다. 기존 ID를 사용하는 실제 데이터는 없다.
- `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`: Opening Variants, Prologue Scene 1~4
- `workspace/projects/chronicles-of-the-twelve-bonds/design/world/world_setting.md`: 플레이어 캐릭터, 십이지신당, 흑의인, 사흉, 피리 속 신령과 인연의 피리
- `workspace/projects/chronicles-of-the-twelve-bonds/design/systems/core_gameplay_systems.md`: 장면 입력 방식과 판정 원칙
- `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`: `narrative_only`, `choice_only`, `standard`·`emphasis` 선택지 표시와 게임오버 UI 규칙
- `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`: 씬 필드, Outcome 처리, ID 규칙, 정보 공개, 응답 검증과 게임오버 저장 규칙
