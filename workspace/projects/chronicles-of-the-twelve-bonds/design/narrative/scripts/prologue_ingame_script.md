# 프롤로그 인게임 스크립트

## Metadata

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 문서 타입: scenario
- 문서 하위 타입: ingame_script
- 상태: confirmed
- 챕터 ID: `CHAPTER_PROLOGUE`[^CW-PROLOGUE-01]
- 작성 범위: Phase 1 `신당 진입과 조우`
- 상위 시나리오: [메인 시나리오](../main_scenario.md)
- 관련 문서: [세계관 설정](../../world/world_setting.md), [핵심 게임 시스템](../../systems/core_gameplay_systems.md), [플레이 UI](../../ui/gameplay_ui.md), [AI GM 런타임 및 데이터 연동 규칙](../../technical/ai_gm_runtime_rules.md)
- 마지막 변경: 2026-07-21

## Usage

- 플레이어 노출 범위: `Player-Visible Script`의 화자명, 지문·대사와 선택지 문구
- 내부 구현 범위: Scene Data, choice·outcome ID, 조건, 상태·RAG 연결과 Production·QA Notes
- 내부 ID와 각주·출처는 플레이어 화면에 표시하지 않는다.
- 창작 표시 규칙: 원본에 직접 없는 내용에는 `CW-PROLOGUE-<number>` 각주를 사용한다.

## Chapter Summary

- 시작 상태: 플레이어가 선택한 주인공 유형에 맞는 이유로 십이지신당에 진입한다.
- 종료 상태: 흑의인의 봉인 파괴 의식을 목격하고 저지·관망·도주 중 하나를 선택한다.
- 핵심 사건: 금지된 주술, 제단의 붉은 균열과 세 선택지 제시
- 범위 외: 선택별 봉인 파괴 결과를 보여주는 Phase 2, 혼돈과 오염의 Phase 3, 신령과 계약하는 Phase 4, 혼돈 전투

## Scene Index

| 순번 | scene_id | 제목 | input_mode | 진입 조건 | 종료/다음 씬 |
|---|---|---|---|---|---|
| P01-S01[^CW-PROLOGUE-01] | `SCENE_PROLOGUE_PHASE_01_ALTAR`[^CW-PROLOGUE-01] | 신당 진입과 조우 | `choice_only` | 새 게임 시작 후 주인공 유형 선택 완료[^CW-PROLOGUE-02] | 선택별 Phase 2 결과 씬[^CW-PROLOGUE-01] |

## Scene Script

### Scene P01-S01: 신당 진입과 조우

#### Scene Data

- 표시 순번: `P01-S01`[^CW-PROLOGUE-01]
- `scene_id`: `SCENE_PROLOGUE_PHASE_01_ALTAR`[^CW-PROLOGUE-01]
- `scene_type`: `TBD` — Unity 씬 타입 열거형 확인 필요
- 장면 목적: 주인공 유형별 오프닝 톤을 보여주고 봉인 파괴 의식과 흑의인을 목격시킨 뒤 세 선택지를 제시한다.
- `location_id`: `LOC_ZODIAC_SHRINE_INNER_ALTAR`[^CW-PROLOGUE-01]
- 시간·상태: 봉인 파괴 의식의 마지막 주문이 끝나기 직전
- 등장인물·허용 화자: `narrator`, `CHAR_PLAYER`[^CW-PROLOGUE-01], `CHAR_BLACK_ROBED_INTRUDER`[^CW-PROLOGUE-01]
- 진입 조건: 새 게임에서 남성 `방랑도사` 또는 여성 `수련무녀` 선택을 완료한다.[^CW-PROLOGUE-02]
- 종료 조건: 허용 선택지 셋 중 하나를 선택하고 연결된 Outcome을 확정한다.
- 다음 씬: 선택에 대응하는 Phase 2 결과 씬[^CW-PROLOGUE-01]
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
| `P01-S01-L001-M`[^CW-PROLOGUE-01] | `narrator` | narration | 사람의 발길이 끊긴 신당 문틈으로 검붉은 기운이 실처럼 새어 나온다.[^CW-PROLOGUE-04] | 남성 `방랑도사` |
| `P01-S01-L002-M`[^CW-PROLOGUE-01] | `CHAR_PLAYER`[^CW-PROLOGUE-01] | dialogue | “허, 술보다 독한 기운이군. 여기까지 불러들였으면 얼굴은 보여 줘야지.”[^CW-PROLOGUE-04] | 남성 `방랑도사` |
| `P01-S01-L001-F`[^CW-PROLOGUE-01] | `narrator` | narration | 순례 내내 좇아온 불길한 흐름이 낡은 신당 안쪽으로 한 줄기처럼 모여든다.[^CW-PROLOGUE-04] | 여성 `수련무녀` |
| `P01-S01-L002-F`[^CW-PROLOGUE-01] | `CHAR_PLAYER`[^CW-PROLOGUE-01] | dialogue | “이렇게 탁한 기운은 처음이야. 근원을 확인해야 해.”[^CW-PROLOGUE-04] | 여성 `수련무녀` |
| `P01-S01-L003`[^CW-PROLOGUE-01] | `narrator` | narration | 이끼와 먼지에 잠긴 회랑을 지나 가장 깊은 제단에 닿자, 검은 옷의 인물이 등을 보인 채 두 손을 들어 올리고 있다.[^CW-PROLOGUE-04] | 공통 |
| `P01-S01-L004`[^CW-PROLOGUE-01] | `narrator` | narration | 알아들을 수 없는 금지된 주문이 낮게 이어질 때마다 제단 위 붉은 균열이 살아 있는 핏줄처럼 번져 간다.[^CW-PROLOGUE-04] | 공통 |
| `P01-S01-L005`[^CW-PROLOGUE-01] | `narrator` | narration | 마지막 주문이 끝나기까지 남은 순간은 길지 않다. 지금 무엇을 할 것인가?[^CW-PROLOGUE-04] | 공통 |

#### Choices / Allowed Actions

| choice/action ID | 플레이어 표시 문구 | 조건 | check_config_id | outcome_id |
|---|---|---|---|---|
| `CHOICE_PROLOGUE_P01_INTERVENE`[^CW-PROLOGUE-01] | 무기를 들고 흑의인을 저지한다. | 항상 | 없음 | `OUTCOME_PROLOGUE_P01_INTERVENE`[^CW-PROLOGUE-01] |
| `CHOICE_PROLOGUE_P01_OBSERVE`[^CW-PROLOGUE-01] | 숨을 죽이고 상황을 지켜본다. | 항상 | 없음 | `OUTCOME_PROLOGUE_P01_OBSERVE`[^CW-PROLOGUE-01] |
| `CHOICE_PROLOGUE_P01_RETREAT`[^CW-PROLOGUE-01] | 불길한 직감을 따라 신전을 빠져나간다. | 항상 | 없음 | `OUTCOME_PROLOGUE_P01_RETREAT`[^CW-PROLOGUE-01] |

#### Outcomes and State

| outcome_id | 확정 결과 | 상태 변화 | 다음 씬 | 공개 정보 |
|---|---|---|---|---|
| `OUTCOME_PROLOGUE_P01_INTERVENE`[^CW-PROLOGUE-01] | 저지를 시도하지만 마지막 주문이 먼저 완성되는 Phase 2 결과로 진행한다. | `FLAG_PROLOGUE_TRIED_TO_STOP_RITUAL = true`[^CW-PROLOGUE-05] | `SCENE_PROLOGUE_PHASE_02_INTERVENE`[^CW-PROLOGUE-01] | 흑의인을 저지하려 했다는 선택 이력 |
| `OUTCOME_PROLOGUE_P01_OBSERVE`[^CW-PROLOGUE-01] | 방해받지 않은 의식이 완성되는 Phase 2 결과로 진행한다. | 별도 보상·패널티 없음 | `SCENE_PROLOGUE_PHASE_02_OBSERVE`[^CW-PROLOGUE-01] | 의식을 지켜봤다는 선택 이력 |
| `OUTCOME_PROLOGUE_P01_RETREAT`[^CW-PROLOGUE-01] | 봉인 파괴의 충격파에 휩쓸리는 Phase 2 결과로 진행한다. | 별도 보상·패널티 없음 | `SCENE_PROLOGUE_PHASE_02_RETREAT`[^CW-PROLOGUE-01] | 신당을 빠져나가려 했다는 선택 이력 |

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
- 어떤 선택도 Phase 1에서 판정·보상·패널티를 발생시키지 않는지 확인한다.
- 저지 선택만 Phase 4의 신령 우호 반응에 사용할 선택 이력을 남기는지 확인한다.
- 선택 전에는 Outcome, 상태와 다음 씬이 적용되지 않는지 확인한다.
- 미등록 `illustration_id`를 임의 값으로 대체하지 않고 검증 오류로 처리하는지 확인한다.

## Open Questions / TBD

- TBD: Unity가 사용할 실제 `scene_type` 값
- TBD: 주인공·흑의인·신당·RAG 연결 ID의 최종 레지스트리 등록 여부
- TBD: 신당 내부 제단의 실제 `illustration_id`
- TBD: 한 화면 글자 수와 line 자동·수동 진행 규칙
- TBD: BGM·효과음·카메라·VFX 리소스의 실제 ID와 제작 가능 범위
- TBD: Phase 2~4와 혼돈 전투의 플레이어 노출 대본

## Creative Footnotes

[^CW-PROLOGUE-01]: `CHAPTER_PROLOGUE`, `P01-S01`, 모든 line·scene·character·location·RAG·choice·outcome·다음 씬 ID는 원본에 ID가 없어서 기술 문서의 명명 규칙에 맞춰 제안했다. 승인 시 Unity 레지스트리와 후속 Phase 문서가 이 이름을 참조하게 되므로 기존 ID가 발견되면 전부 함께 변경해야 한다.
[^CW-PROLOGUE-02]: 새 게임의 주인공 유형 선택 완료를 진입 조건으로 표현한 것은 성별 선택과 오프닝 변형을 데이터 조건으로 연결하기 위한 창작이다. 새 사건은 추가하지 않지만 캐릭터 생성 흐름과 실제 연결 방식은 UI·기술 구현 확인이 필요하다.
[^CW-PROLOGUE-03]: `narrative_tier: cinematic`은 봉인 붕괴 직전 장면의 연출 밀도를 높이기 위한 창작 제안이다. 서사 결과는 바꾸지 않지만 선택형 서술가 호출 여부와 응답 시간 예산에 영향을 준다.
[^CW-PROLOGUE-04]: `P01-S01-L001-M`부터 `L005`까지의 구체적인 문장과 남녀 독백은 원본의 주인공 톤, 신당 상태, 흑의인의 의식과 붉은 균열만 근거로 새로 쓴 플레이어 노출 대본이다. 사건·선택 결과는 바꾸지 않지만 캐릭터 인상과 장면 분위기를 확정하므로 문체 승인이 필요하다.
[^CW-PROLOGUE-05]: `FLAG_PROLOGUE_TRIED_TO_STOP_RITUAL`은 Phase 4에서 신령이 용기를 알아보고 우호적으로 반응한다는 확정 결과를 저장하기 위한 창작 상태 표현이다. 보상·수치 효과는 없지만 세션 상태 스키마와 Phase 4 조건이 같은 키를 사용해야 한다.
[^CW-PROLOGUE-06]: 배경 구도, BGM, 효과음, 카메라, 애니메이션과 리소스 요구는 원본에 없는 제작 연출 제안이다. 스토리·규칙은 바꾸지 않지만 에셋 제작 범위와 장면 구현 비용에 영향을 주므로 실제 리소스 ID와 제작 가능성을 별도 확인해야 한다.

## Sources

- `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`: Opening Variants, Prologue Phase 1~2
- `workspace/projects/chronicles-of-the-twelve-bonds/design/world/world_setting.md`: 플레이어 캐릭터, 십이지신당, 흑의인
- `workspace/projects/chronicles-of-the-twelve-bonds/design/systems/core_gameplay_systems.md`: 장면 입력 방식과 판정 원칙
- `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`: `choice_only`, `standard` 선택지 표시와 UI 오류 규칙
- `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`: 씬 필드, Outcome 처리, ID 규칙, 정보 공개와 응답 검증
