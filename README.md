# GamePM Codex Workspace

이 저장소는 OpenAI API로 실행되는 별도 제품이 아니라, Codex가 이 폴더의 규칙과 문서를 읽고 게임 기획 작업을 수행하는 로컬 문서형 에이전트 작업장이다.

Codex는 문서 요청 분기, 자료 기반 기획서 초안 작성, 변경안 생성, 충돌
검토, 승인 큐 정리, 결정 로그 작성, 버전 기록 초안 생성을 돕는다.
단, 확정 문서는 사용자의 명시적 승인 이후에만 수정한다.

## 주요 제공 기능

- 프로젝트 관리: 게임마다 Brief, 확정 기획 문서, 아이디어, 승인 큐, 결정과
  버전 기록을 독립적으로 관리한다.
- 기획서 작성: 게임 개요, 세계관, 시스템, 콘텐츠, UI와 기술 문서를 기존
  프로젝트 자료에 근거해 신규 작성하거나 변경안으로 만든다.
- 기획 창작: 프로젝트 적응형 `design_creative_planner`가 기획서의 빈 부분을
  창작 가능한 GAP과 사용자 확인이 필요한 사실로 구분한다. 사용자가 허가한
  GAP에만 복수 대안과 추천안을 만들고, 선택된 창작 내용은 `CP-*`로 공개한다.
- 시나리오 창작·검수: `scenario_designer`가 원안 기반 시나리오 Draft와 구조
  개선안을 분리해 작성하고 `scenario_reviewer`가 원본을 직접 대조해 독립
  검수한다.
- 인게임 스크립트 창작: 프로젝트 전담 `scenario_writer`가 플레이어 노출
  대사·지문·선택지와 씬 명세를 작성한다. 구체 창작은 `CW-*`, 원본 서사
  구조 변경은 `NR-*`로 공개하며 `scenario_reviewer`가 독립 검수한다.
- 승인과 추적: 모든 창작·변경안은 승인 전 제안이며, 명시적 승인과 원본
  재확인 후에만 확정 문서에 반영하고 Decision Log와 Version History에 남긴다.

## Core Principle

### Human in the Loop

- Codex는 분석, 초안, 변경안, 질문, 검토 결과를 만든다.
- 승인 전 산출물은 `workspace/projects/<project_slug>/approvals/approval_queue.md`에 둘 초안으로 취급한다.
- 사용자가 명시적으로 승인하기 전에는 `workspace/projects/<project_slug>/design/`의 확정 문서를 수정하지 않는다.
- 승인된 변경은 Decision Log와 Version History에 함께 기록한다.

## Core Workflows

### Project Workspace

- 등록 프로젝트와 현재 기본 프로젝트는 `workspace/project_registry.md`에서 확인한다.
- 모든 게임별 자료는 `workspace/projects/<project_slug>/` 아래에서 독립적으로 관리한다.
- 각 프로젝트 루트의 `README.md`에서 간단한 소개, 현재 초점, 생성된 확정
  기획 문서와 작업 기록 링크를 확인한다.
- 새 게임을 만들 때는 기존 프로젝트 폴더를 재사용하지 않고 Project Brief, Design, Ideas, Approvals, Decisions와 Versions 구조를 새로 만든다.
- 여러 프로젝트가 있고 요청에서 대상을 알 수 없으면 Codex는 파일을 변경하기 전에 대상 프로젝트를 확인한다.

### Temporary Idea

- 확정 반영 요청이 없는 아이디어는 `workspace/projects/<project_slug>/ideas/temporary_ideas.md`에
  확정 문서와 분리해 기록한다.
- 아이디어를 문서화하거나 변경안으로 발전시킬 때는 관련 자료를 다시
  검색하고 Approval Queue 항목으로 전환한다.
- `converted` 상태는 승인을 의미하지 않으며, 명시적 승인 전에는 확정
  문서를 수정하지 않는다.

### Approval States

- 승인 항목은 `pending`, `approved`, `applied`, `needs_reconfirmation`,
  `on_hold`, `change_requested`, `rejected` 상태로 관리한다.
- `괜찮네`, `좋아 보이네`처럼 승인 여부가 애매한 표현은 승인이나 적용으로
  처리하지 않는다. 이때 Codex는 아무 변경도 적용하지 않았고 현재 상태를
  유지했다고 안내하며, 대상 ID를 명시한 승인·적용 문구를 요청한다.
- 보류·수정 요청·거부 결정은 기존 초안과 결정 이력을 덮어쓰지 않고
  Decision Log에 기록한다.
- 수정 대상이나 핵심 범위가 달라지면 기존 항목을 보존하고 연결된 새 승인
  항목을 만든다.

### Asset Promotion

- 승인 전 검토 이미지는 프로젝트의 `approvals/assets/`에 둔다.
- 승인된 이미지를 적용할 때 `design/assets/`에 반영하고 SHA-256 동일성과
  문서 참조를 확인한다.
- 검증된 canonical 경로로 승인·이력 문서의 참조를 갱신한 뒤 대응하는
  `approvals/assets/` 파일을 삭제해야 항목을 `applied`로 처리한다.
- 단순 `approved` 상태이거나 적용·재확인이 실패한 경우에는 검토본을
  유지한다.

### Source Reconfirmation

- 승인 항목에는 변경안 작성 당시의 기준 Git 커밋, 대상 문서 경로, 비교
  대상과 원본 요약을 기록한다.
- 적용 직전에 현재 원본을 다시 확인하고, 내용이나 영향 범위가 달라졌으면
  적용을 중단해 `needs_reconfirmation`으로 이동한다.
- 기존 승인은 재사용하지 않으며, 갱신된 기준 정보와 초안에 대한 명시적
  재승인 후에만 적용한다.

### Document Deletion

- 확정 문서 삭제 요청은 `delete_existing_document`로 별도 분기한다.
- 삭제 전에 링크 단절, 설정 유실, 관련 문서 영향과 대체 문서를 검토한다.
- 명시적 승인 후 대상 문서를 삭제하고 Decision Log와 Version History에
  `delete` 기록을 남긴 뒤 승인 항목을 `applied`로 변경한다.

### Document Ownership

- 사용자 입력은 `docs/workflows/document_structure.md`에 따라 게임 개요,
  세계관, 시나리오, 시스템, 콘텐츠, UI와 기술 문서로 먼저 분류한다.
- `game_overview`는 핵심 경험, 상위 루프, 거시 진행과 문서 지도를 관리한다.
- 상세 설정·장면·규칙·콘텐츠·기술 정보는 역할별 상세 문서가 원본으로
  소유하고 개요서에는 짧은 요약과 상대경로 링크만 둔다.
- 여러 역할을 함께 분리하거나 갱신할 때는 `restructure` 승인 항목으로 묶고
  모든 대상을 재확인한 뒤 원자적으로 적용한다.

### Design Creative Completion

- `design_creative_planner`는 대상 문서 역할에 맞는 프로젝트 적응형 설계자
  관점을 구성하고 `classify`, `generate_options`, `incorporate_selection`의 세
  Phase로 동작한다.
- `classify` Phase에서 신규·수정·재구성 기획 Draft의 누락을
  `creative_fillable`, `user_fact`, `dependency` GAP으로 분류하지만 대안은
  만들지 않는다.
- 메인 Codex가 전체 GAP 목록과 “창작으로 채울까요?”를 먼저 제시한다.
  사용자가 허가한 정확한 GAP ID만 `generate_options` Phase에 전달한다.
- 허가된 저·중위험 GAP에는 대안 2개, 고위험 GAP에는 대안 3개와 추천안을
  제시한다. 선택된 안만 Draft에 `CP-*` 각주로 넣고 모든 대안과 영향을
  `Creative Proposal Log`에 보존한다.
- 실제 플랫폼·엔진·예산·일정·에셋 ID·외부 계약 같은 사실은 창작하지 않고
  `TBD`로 유지한다. 밸런스 수치는 검증 계획이 있는 `provisional` 가설로만 제안한다.
- 대안을 선택하면 메인 Codex가 원본을 재확인한 뒤 선택 결과만
  `incorporate_selection` Phase에 전달한다. 창작 허가와 대안 선택은 승인이
  아니며, 메인 검토를 거친 갱신 Draft를 `pending`으로 다시 검토하고 명시적
  승인 뒤에만 확정 문서에 반영한다.
- 일반 시나리오 구조는 `Scenario Improvement Review`, 인게임 스크립트는
  `CW-*`·`NR-*`를 우선하며 같은 내용에 `CP-*`를 중복 사용하지 않는다.

### Specialist Agent Handoff

- 메인 Codex는 전문 에이전트를 호출하기 전에 프로젝트, 작업 Phase, 사용자
  목표, 범위·제외, 근거 파일, 대화에서 결정된 사실·선택·금지사항, 권한 경계와
  기대 출력을 `Specialist Task Packet`으로 작성한다.
- 호출은 정확한 전문 `agent_type`과 `fork_turns: "none"`을 사용한다. 부모
  대화 전체를 넘기거나 전문 역할과 전체 대화 상속을 함께 요청하지 않는다.
- 필수 인계 정보가 없으면 전문 에이전트는 `blocked_missing_handoff`를
  반환하고 Draft, 대안 또는 검수 판정을 만들지 않는다.
- 모든 사실과 입력에는 사용자 입력, 확정 문서, 허가된 제안 또는 합성
  테스트 픽스처 중 하나의 출처 유형과 근거를 기록한다. 합성 데이터를 사용자
  사실로 분류하면 `blocked_test_provenance`로 중단한다.
- Task Packet 준비와 전문 작업 모두 정확한 canonical 경로만 읽는다. 확정
  근거가 충분하면 검색을 중단하고, 사용자가 지정하지 않은 승인 큐·아이디어·
  결정·버전 기록이나 전체 design 트리를 예방적으로 열지 않는다.

### Behavior Test Isolation

- 동작 테스트의 합성 입력은 처음부터 결과 보고까지
  `[TEST FIXTURE: SYNTHETIC]`과 `synthetic_test_fixture`를 유지한다.
- 기본 테스트는 등록 프로젝트와 분리된
  `tests/fixtures/behavior/sample-game/`을 `/tmp`에 복사해 실행한다.
- 실제 프로젝트 구조가 꼭 필요할 때만 `/tmp` 임시 복사본을 사용하고,
  테스트 전후 원본이 바뀌지 않았는지 비교한다.
- 결과에는 데이터 출처, 실행 환경, 원본 변경 여부와 실제 프로젝트 사실로
  채택하지 않았음을 명시한다.
- 메인 Codex는 결과를 Task Packet과 다시 대조하고 범위 초과, 사용자 정보
  누락이나 권한 추정이 있으면 Approval Queue에 저장하거나 적용하지 않는다.

### Scenario Authoring Modes

시나리오 관련 요청은 작성자와 독립 검수자를 분리한다. 메인 Codex는 프로젝트,
범위와 근거를 확정하고 검수 통과 결과만 승인 초안으로 저장한다.

| 요청 | 작성 담당 | 독립 검수 | 개선안 처리 | 공개 방식 |
|---|---|---|---|---|
| 일반 시나리오 자료 검토·문서 작성·수정 | `scenario_designer` | `scenario_reviewer` | 원안 기반 Draft를 보존하고 더 나은 전개·분기를 별도 권고 | `Scenario Improvement Review` |
| 플레이어 노출 인게임 스크립트 작성 | `scenario_writer` | `scenario_reviewer` | 더 나은 구조를 하나의 최적안에 직접 반영 | 구조 변경은 `NR-*`, 구체 창작은 `CW-*` |

시나리오나 기존 인게임 스크립트의 검토만 요청한 경우에는 작성 에이전트를
거치지 않고 `scenario_reviewer`가 대상 원본을 직접 검수해 Review Report를
반환한다. 변경 Draft가 필요하면 그때 작성 에이전트 파이프라인으로 진입한다.

### General Scenario Subagent Pipeline

- 메인 Codex는 대상 프로젝트, canonical owner, 범위와 근거 파일을 확정해
  `scenario_designer`에 전달한다.
- `scenario_designer`는 프로젝트별 Scenario Designer's Brief를 구성하고 원안
  기반 Draft, GAP 목록과 분리된 `Scenario Improvement Review`를 작성한다.
- `scenario_reviewer`는 작성자의 요약에 의존하지 않고 Project Brief, 게임
  개요, 관련 확정 시나리오·세계관·시스템 문서를 직접 읽어 인과, 동기, 긴장,
  정보 공개, 선택, 분기·합류와 Outcome을 독립 검수한다.
- `blocking` 또는 `required_revision` 결과는 원 작성자에게 되돌리고 재검수한다.
  선택적 개선 의견은 자동 반영하지 않고 Scenario Improvement Review 후보로
  유지한다.
- 요청과 자료에 충실한 Draft는 보존하며 개선 권고를 자동으로 섞지 않는다.
  개선점이 없으면 `추가 개선 권고 없음`으로 기록한다.
- 사용자가 권고를 선택하면 원본을 다시 확인해 Draft와 영향 분석을 갱신하고
  `pending`으로 다시 검토받는다. 권고 선택 자체는 승인이나 적용 권한이 아니다.
- 일반 시나리오 권고에는 `NR-*`를 강제하지 않는다. `scenario_writer`가 상위
  시나리오와 다른 구조를 인게임 스크립트에 직접 사용하는 경우에만 전용
  Narrative Revision 규칙을 적용한다.

요청 예시:

```text
<project_slug> 프로젝트의 시나리오 자료를 일반 시나리오 문서 초안으로 작성해줘.
원안에 충실한 Draft는 유지하고, 더 나은 사건 순서나 분기가 있으면 이유와
기대 효과를 Scenario Improvement Review에 별도로 제안해줘.
개선안은 자동 반영하지 말고 pending 승인안으로 정리해줘.
```

### Scenario Writer Subagent

- 프로젝트 custom agent `scenario_writer`는 선택된 게임의 전담 시나리오
  라이터로 동작한다. 원본을 대본으로 옮기는 보조 역할이 아니라 게임의 약속,
  승인된 문체와 전체 서사를 이해하고 가장 강한 플레이 장면을 작성한다.
- 프로젝트 Brief, 게임 개요, 세계관, 상위 시나리오와 기존 승인 대본에서
  프로젝트별 작가 정체성을 구성하며 다른 게임의 문체를 재사용하지 않는다.
- 원본보다 나은 구조가 있으면 사건 순서, 공개 시점, 분기, Outcome과 인물
  동기를 개선한 하나의 최적안으로 바로 작성한다.
- 구체 창작은 `CW-*` 각주, 원본 서사 구조 변경은 `NR-*` Narrative Revision
  Log로 공개한다. 어떤 제안도 승인 전에는 확정 사실이 아니다.
- 작가는 read-only handoff를 반환하고 `scenario_reviewer`의 독립 검수를
  거친다. 저장 요청이 있으면 메인 Codex만 같은 프로젝트의 Approval Queue에
  `pending`으로 기록한다.

#### 사용 흐름

1. 사용자가 프로젝트, 상위 시나리오, 대상 챕터·Scene과 범위를 지정한다.
   인게임 스크립트 요청은 범위 안의 창작과 구조 개선안 작성을 허용하지만
   확정 문서 적용을 허용하지는 않는다.
2. 메인 Codex는 대상 프로젝트를 하나로 확정하고 관련 자료를 검색한 뒤 요청을
   `draft_ingame_script`로 분류한다. 프로젝트나 범위가 모호하면 집필 전에
   필요한 정보만 질문한다.
3. 메인 Codex는 작업을 `scenario_writer`에 위임한다. 에이전트는 프로젝트
   Brief와 게임 개요에서 플레이 경험을, 세계관·상위 시나리오에서 정사와
   감정선을, 기존 승인 대본에서 실제 문체와 대사 리듬을 읽는다.
4. 에이전트는 `Writer's Brief`에 서사 정체성, 장면 감정 목표, 극적 질문,
   긴장 곡선, 인물 말투·서브텍스트, 선택 경험과 재구성 방향을 기록한다.
5. 에이전트는 원본 구조를 진단하고 더 나은 구조가 있으면 그 구조로 단일
   최적안을 작성한다. 플레이어 대본과 씬 조건·분기·Outcome·상태·제작 메모를
   한 문서에 결합한다.
6. 문서 후반의 `NR-*` 로그에는 원본과 달라진 구조, 변경 이유, 기대 효과,
   후속 영향과 동기화할 상위 문서를 적는다. 구체 창작 문장·ID·연출은 별도의
   `CW-*` 각주로 공개한다.
7. 메인 Codex는 결과를 `scenario_reviewer`에 전달한다. 검수자는 원본, 작가
   브리프, 구조 변경, 창작 각주, 씬 데이터, `TBD`, 충돌과 의존성을 직접
   검토하며 필수 수정은 작가에게 되돌린다.
8. 검수 통과 후 메인 Codex가 상위 시나리오 변경, 대본과 링크 갱신을 하나의
   `restructure` 승인 항목으로 저장한다.
9. 세계관 정사나 시스템 규칙 변경이 필요한 부분은 별도 고위험 승인 항목으로
   분리하고 대본에는 `TBD`로 남긴다. 선행 항목 적용 후 대본을 재확인하고
   다시 승인받는다.
10. 사용자가 `restructure` 항목을 명시적으로 승인하면 적용 직전 모든 원본을
   재확인한다. 기준이 같을 때만 상위 시나리오, 인게임 스크립트와 링크를 함께
   반영하고 Decision Log와 Version History를 기록한다. 기준이 달라졌으면
   `needs_reconfirmation`으로 이동한다.

요청 예시:

```text
<project_slug> 프로젝트의 확정 시나리오 <scenario_path>를 기준으로
Chapter 2 Scene 1을 인게임 스크립트 승인 초안으로 작성해줘.
이 게임의 전담 시나리오 라이터로서 원본보다 더 나은 사건 순서, 공개 시점,
분기나 Outcome이 있으면 최적안에 직접 반영해줘.
원본과 달라진 구조는 NR 로그에 이유와 영향을 적고, 구체 창작은 CW 각주로 공개해줘.
상위 시나리오 동기화까지 하나의 pending restructure 승인 항목으로 저장해줘.
```

## How To Use

Codex 입력창에서 이 저장소를 열고 자연어로 요청한다.

예시:

```text
docs/workflows/document_change.md 규칙에 따라 상점 NPC 설정 요청을 분기해줘.
확정 문서는 수정하지 말고 승인 큐 항목으로 작성해줘.
```

```text
docs/workflows/document_change.md 규칙에 따라 있는 자료들로 전투 기획서 초안을 만들어줘.
관련 문서를 먼저 확인하고 충돌 가능성도 같이 정리해줘.
```

```text
전투 시스템 기획서의 누락을 GAP으로 분류해줘.
창작 가능한 항목은 먼저 목록으로 보여주고 내가 허가한 GAP에만 복수 대안과
추천안을 만들어줘. 선택한 내용은 CP 각주와 Creative Proposal Log에 남겨줘.
```

```text
docs/workflows/document_change.md 규칙에 따라 전투 시스템 변경 요청을 검토해줘.
기존 문서 수정인지 신규 문서 생성인지 먼저 판정해줘.
```

```text
workspace/projects/<project_slug>/approvals/approval_queue.md의 첫 번째 항목을 승인할게.
승인 흐름에 따라 확정 문서, 결정 로그, 버전 기록을 갱신해줘.
```

```text
이 아이디어는 아직 확정하지 말고 Temporary Idea로 저장해줘.
```

```text
docs/workflows/document_change.md 규칙에 따라 오래된 전투 문서 삭제를 검토해줘.
확정 문서는 삭제하지 말고 영향 분석과 승인 큐 항목만 작성해줘.
```

```text
승인 항목을 적용하기 전에 기준 Git 커밋과 현재 원본을 재확인해줘.
달라졌다면 적용하지 말고 needs_reconfirmation으로 이동해줘.
```

## Repository Map

```text
AGENTS.md
README.md

.codex/
  agents/
    design_creative_planner.toml
    scenario_designer.toml
    scenario_reviewer.toml
    scenario_writer.toml

docs/
  plan.md
  architecture.md
  checklist.md
  workflows/
  templates/
  skills/

workspace/
  project_registry.md
  projects/
    <project_slug>/
      README.md
      project_brief.md
      design/
        assets/
        game/
        world/
        narrative/
          scripts/
        systems/
        content/
        ui/
        technical/
      ideas/
      approvals/
        assets/
      decisions/
      versions/
```

## Important References

- `AGENTS.md`: Codex가 이 저장소에서 반드시 지켜야 하는 전체 규칙
- `docs/workflows/project_workspace.md`: 대상 프로젝트 선택과 새 프로젝트 생성·분리 절차
- `docs/workflows/specialist_agent_handoff.md`: 전문 에이전트 필수 인계 정보, 호환 호출 방식과 반환 검증
- `docs/templates/specialist_task_packet.md`: 부모 대화 대신 전문 에이전트에 전달할 작업 계약 형식
- `docs/workflows/behavior_testing.md`: 합성 동작 테스트의 출처 표시, 격리 실행과 결과 보고 규칙
- `docs/templates/behavior_test_manifest.md`: 동작 테스트 전에 작성하는 출처·환경 계약
- `docs/workflows/`: 작업별 실행 절차. 문서 관련 요청은 `document_change`를 먼저 따른다.
- `docs/workflows/document_structure.md`: 문서 역할, 표준 경로, 개요서 깊이와 링크 규칙
- `docs/templates/project_readme.md`: 프로젝트 소개와 생성된 확정 문서를 보여주는 랜딩 페이지 형식
- `docs/skills/design_creative_completion.md`: `design_creative_planner`의 기획 공백 분류, 창작 허가, 복수 대안, `CP-*` 공개와 선택 규칙
- `docs/skills/scenario_review.md`: `scenario_designer` 작성과 `scenario_reviewer` 독립 검수, 일반 시나리오 분리 권고 규칙
- `docs/workflows/temporary_idea.md`: 임시 아이디어 등록·수정·승인 제안 전환 절차
- `docs/workflows/approval_queue.md`: 승인 상태 전환, 원본 재확인, 승인 적용 절차
- `docs/workflows/write_ingame_script.md`: 시나리오를 플레이어 노출 대본과 씬 명세로 변환하는 절차
- `docs/checklist.md`: 구조 확인과 시나리오 기반 workflow 검증 기준
- `docs/templates/`: 승인 큐, 기획서, 결정 로그, 버전 기록 템플릿
- `docs/skills/`: 반복 작업에 적용할 전문 규칙
- `.codex/agents/scenario_writer.toml`: 챕터별 인게임 스크립트 승인 초안을 작성하는 custom agent
- `.codex/agents/scenario_designer.toml`: 일반 시나리오 Draft와 분리 개선안을 작성하는 custom agent
- `.codex/agents/scenario_reviewer.toml`: 일반 시나리오와 인게임 스크립트를 독립 검수하는 custom agent
- `.codex/agents/design_creative_planner.toml`: 일반 기획 GAP을 분류하고 허가된 GAP의 대안을 만드는 custom agent
- `workspace/project_registry.md`: 프로젝트 목록과 현재 기본 프로젝트
- `workspace/projects/`: 프로젝트별 실제 기획 문서와 작업 상태

`docs/dev-log/`는 과거 개발 기록 보관용이다. 현재 행동 규칙, 아키텍처, 워크플로우 판단에는 사용하지 않는다.

## Verification

외부 패키지 없이 Python 표준 `unittest`로 결정적인 작업장 무결성 검사를
실행할 수 있다.

```bash
python3 -m unittest discover -s tests -v
```

테스트 코드는 등록 프로젝트의 필수 구조, 실제 탐색 문서의 로컬 링크, 승인
ID 중복과 제목·Metadata 일치, `applied` 승인 항목의 Decision Log·Version
History 연결, 테스트 입력의 출처 분류와 Behavior Test Manifest의 격리
조건을 검사한다. 템플릿의 예시 경로, Approval Queue 안의 역사적 Draft
링크, 외부 URL과 코드 블록은 링크 검사에서 제외한다.

자동 판정하기 어려운 에이전트 행동과 기획 품질은 변경 후 다음 항목을 별도로
확인한다.

- 승인 전 확정 문서를 수정하지 않았는가
- 변경안이 승인 큐 형식으로 작성되었는가
- 승인된 변경에 Decision Log와 Version History 기록이 남았는가
- 승인 에셋이 `design/assets/`에서 검증되고 문서 참조가 canonical 경로로
  갱신된 뒤 대응하는 `approvals/assets/` 검토본이 삭제되었는가
- 임시 아이디어 등록과 승인 제안 전환이 확정 문서와 분리되었는가
- 문서 관련 요청이 검색 후 생성, 수정, 삭제, 자료 취합, 기획서화, 질문으로 분기되었는가
- 승인 항목에 기준 Git 커밋, 대상 경로, 비교 대상과 원본 요약이 있는가
- 원본 불일치 시 적용을 중단하고 `needs_reconfirmation`으로 이동했는가
- 보류·수정 요청·거부의 상태와 결정 이력이 보존되었는가
- 삭제 전 영향과 대체 문서를 검토하고 승인 후 `delete` 기록을 남겼는가
- `docs/checklist.md`의 시나리오 항목을 실제 검증 없이 완료 표시하지 않았는가
- 일반 시나리오와 인게임 스크립트가 작성자와 `scenario_reviewer`의 독립 검수
  단계를 모두 거쳤는가
- 일반 기획 창작이 `design_creative_planner`의 Phase와 사용자 허가 GAP 범위를
  지켰는가
- 기획 문서와 변경안이 `docs/templates/`의 형식을 따르는가
- 상세 정보가 올바른 canonical owner 문서에 있고 개요서에는 요약과 링크만 있는가
- 프로젝트 루트 README가 간단한 소개와 현재 존재하는 확정 문서만 보여주며
  상세 사실의 원본 역할을 대신하지 않는가
- `restructure`가 일부 적용되지 않고 모든 대상의 원본 재확인 후 적용되었는가
- 모든 프로젝트 자료와 승인·결정·버전 기록이 올바른 프로젝트 폴더 안에 있는가
- 일반 시나리오 Draft와 `Scenario Improvement Review`가 분리되고, 선택된
  권고도 갱신된 `pending` 승인안으로 다시 검토되는가
- 기획 Draft의 GAP이 유형별로 분류되고, 명시적 허가 전에는 창작 대안이
  생성되지 않으며 선택된 내용만 `CP-*`로 공개되는가
- `user_fact`는 `TBD`로 유지되고 수치 창작은 `provisional` 상태, 검증 지표와
  재조정 조건을 가지는가
- 창작안 선택 후 원본을 재확인한 Draft가 `pending`으로 다시 검토되며 적용된
  CP ID가 Decision Log와 Version History에 남는가
- 인게임 스크립트에 프로젝트별 Writer's Brief가 있고, 구조 변경은 `NR-*`,
  구체 창작은 `CW-*`로 빠짐없이 공개되었는가
- 상위 시나리오 구조 변경과 대본·링크가 하나의 `restructure` 항목으로 묶이고
  승인 전 `design/narrative/`가 변경되지 않았는가
- 세계관·시스템 변경 의존성이 별도 고위험 승인 항목과 `TBD`로 분리되었는가
