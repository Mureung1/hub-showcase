# Architecture

## 1. Overview

GamePM Codex Workspace는 코드 실행 제품이 아니라 문서 기반 작업 환경이다.

```text
User
  -> Codex 입력창
    -> AGENTS.md
    -> .codex/agents/
    -> docs/workflows/
    -> docs/skills/
    -> docs/templates/
    -> workspace/
```

Codex가 에이전트 실행부 역할을 하고, 이 저장소의 Markdown 파일들이 규칙, 메모리, 승인 상태, 산출물 역할을 한다.

## 2. Directory Roles

### `.codex/agents/`

프로젝트에서 반복 사용하는 전문 custom agent를 정의한다.

- `scenario_designer.toml`: 일반 시나리오의 원안 기반 Draft와 분리 개선안을
  작성한다.
- `scenario_writer.toml`: 프로젝트별 전담 작가 정체성을 구성하고 인게임
  대본·씬 명세와 `CW-*`·`NR-*`를 작성한다.
- `scenario_reviewer.toml`: 두 시나리오 산출물의 원본 충실도, 서사 품질,
  플레이 가능성과 창작 공개를 독립 검수한다.
- `design_creative_planner.toml`: 일반 기획 GAP을 분류하고 사용자가 허가한
  GAP에만 복수 대안과 추천안을 만든다.
- `design_creative_reviewer.toml`: 프로젝트 창작 규칙이 요구한 비시나리오
  독립 검수를 수행한다.

모든 custom agent는 read-only handoff를 메인 Codex에 반환한다. 메인 Codex가
프로젝트·범위와 사용자 허가를 확정하고, 필수 검수 결과가 해소된 뒤에만
Approval Queue에 `pending` 항목을 저장한다.

메인 Codex는 모든 custom agent 호출 전에
`docs/workflows/specialist_agent_handoff.md`의 Specialist Task Packet을
완성한다. 호출은 전문 `agent_type`과 `fork_turns: "none"`을 사용하며,
부모 대화 전체 대신 작업에 필요한 사용자 사실, 선택, 금지사항, 권한 경계와
근거 파일만 명시적으로 전달한다.

창작 agent type은 저장소 공용 실행 역할이다. 프로젝트별 창작 정체성은
`workspace/projects/<project_slug>/agents/rules/`의 독립 분야별 규칙으로
저장하고, Task Packet이 규칙 기준(`active_current | archived_snapshot`)과
정확한 규칙 ID·경로·버전·SHA-256을 공용 실행 역할에 전달한다. 프로젝트
규칙마다 별도 custom agent 설정을 만들지 않는다.

에이전트 동작 테스트는 `docs/workflows/behavior_testing.md`의 출처 게이트를
먼저 통과한다. 합성 입력은 등록 프로젝트 밖의 전용 픽스처를 `/tmp`에 복사해
실행하고, Task Packet과 결과 보고까지 `synthetic_test_fixture` 출처를
보존한다. 출처 누락이나 사용자 사실 오분류는 `blocked_test_provenance`로
중단한다.

### `docs/workflows/`

작업 절차를 정의한다. Codex는 요청 유형에 맞는 workflow를 먼저 확인한 뒤 작업한다.
문서 관련 요청은 먼저 `document_change` workflow에서 검색과 분기를 수행한 뒤,
필요한 하위 workflow로 이동한다.
확정 반영 요청이 없는 아이디어는 `temporary_idea` workflow에서 등록하거나
승인 제안 전환 여부를 판단한다.

### `docs/skills/`

반복적으로 쓰는 판단 기준과 품질 규칙을 정의한다. 예: 충돌 검토, 문서 보완
질문, 한국어 기획 문체와 일반 시나리오 구조 검토. `scenario_designer`가
`scenario_review`로 원안 기반 Draft와 개선 권고를 분리하고,
`scenario_reviewer`가 같은 원본을 직접 읽어 검수한다.

`design_creative_planner`는 `document_completion`과
`design_creative_completion`에 따라 신규·수정·재구성 비시나리오 기획 Draft의
GAP을 분류하고, 사용자가 명시적으로 허가한 설계 공백에만 복수 대안과
추천안을 만든다. 선택된 기획 창작은 `CP-*`로 공개하며 선택 후에도 `pending`
승인을 거친다.

### `docs/templates/`

산출물 형식을 정의한다. 승인 큐, 변경안, 기획서, 결정 로그, 버전 기록은 템플릿을 따른다.
게임 개요, 세계관, 시나리오와 시스템은 역할별 템플릿을 우선 사용한다.

### `workspace/`

프로젝트 레지스트리와 프로젝트별 상태를 저장한다.

- `project_registry.md`: 등록 프로젝트와 현재 기본 프로젝트
- `projects/<project_slug>/README.md`: Project Brief와 확정 문서에서 파생한
  프로젝트 소개, 현재 초점, 확정 문서 지도와 작업 기록 링크
- `projects/<project_slug>/project_brief.md`: 프로젝트 정체성, 현재 초점과 제약
- `projects/<project_slug>/agents/`: 첫 프로젝트 창작 규칙이 구현될 때만
  생성되는 선택적 행동 설정
  - `README.md`: active·retired 프로젝트 창작 규칙 색인
  - `rules/`: 분야별 독립 창작 규칙. canonical game fact를 소유하지 않는다.
- `projects/<project_slug>/design/`: 승인된 확정 기획 문서와 문서 색인
  - `assets/`: 승인 적용과 동일성 검증이 끝난 canonical 이미지 에셋
  - `game/`: 상위 게임 개요와 전체 방향
  - `world/`: 세계관, 인물, 세력, 장소와 오브젝트의 정사 설정
  - `narrative/`: 시나리오, 장면, 분기, 복선과 엔딩
    - `scripts/`: 승인된 챕터별 인게임 스크립트와 씬 구현 명세
  - `systems/`: 게임플레이 규칙, 판정, 상태 변화와 밸런스
  - `content/`: 지역, 노드, 퀘스트, 아이템, 적과 보상
  - `ui/`: 화면과 상호작용 명세
  - `technical/`: 런타임, 데이터, 저장과 연동 명세
- `projects/<project_slug>/ideas/`: 임시 아이디어
- `projects/<project_slug>/approvals/`: 승인 대기 변경안과 임시 검토용 에셋.
  적용이 끝난 에셋은 `design/assets/`만 남기고 검토용 사본은 삭제한다.
- `projects/<project_slug>/decisions/`: 프로젝트 결정 로그
- `projects/<project_slug>/versions/`: 프로젝트 버전 기록

게임 고유 정보는 해당 프로젝트 루트 밖에 저장하지 않는다.

### `docs/dev-log/`

과거 개발 기록 보관용이다. 현재 아키텍처, 행동 규칙, workflow 정책의 근거로 사용하지 않는다.

## 3. Subagent Orchestration

```text
모든 전문 호출
  Main → Specialist Task Packet 검증
       → provenance gate
       → 필요한 경우 Project Creative Agent Rule 검증
       → agent_type + fork_turns: "none"
       → specialist entry check
       → read-only handoff
       → Main return check

일반 시나리오
  Main → project scenario rule → scenario_designer
       → scenario_reviewer → Main → pending

시나리오·스크립트 검토 전용
  Main → scenario_reviewer → Main → review report

인게임 스크립트
  Main → project script rule → scenario_writer
       → scenario_reviewer → Main → pending

일반 기획 창작
  Main → design_creative_planner(classify)
       → 사용자 허가
       → project field rule 확인
       → design_creative_planner(generate_options)
       → rule review policy에 따른 design_creative_reviewer
       → 사용자 선택·원본 재확인
       → design_creative_planner(incorporate_selection)
       → Main → pending
```

`scenario_reviewer`의 `blocking` 또는 `required_revision`이 남으면 원 작성
에이전트로 되돌려 재검수한다. `design_creative_planner`에는 메인 Codex가
확인한 정확한 GAP ID만 전달하며, 서브에이전트가 창작 허가를 추정하지 않는다.
Approval Queue 저장, 승인 판단, 원본 재확인과 적용은 메인 Codex에만 있다.

프로젝트 창작 규칙이 없으면 창작 호출 전에
`blocked_missing_creative_rule`로 창작 실행을 중단하고 현재 대화에서
planning-only 설정 workflow를 자동으로 수행한다. 메인 Codex는 필요한
항목의 용도를 설명하고 최소 확정 근거로 완성된 권장안을 제시하며, 사용자가
답하지 않은 항목은 공개한 보수적 기본값으로 채운다. 기존 규칙이 요청과 맞지
않으면
`blocked_creative_rule_mismatch`로 중단하며 사용자가 개정을 요청하기 전에는
자동 수정하지 않는다. 색인은 canonical role, `exact | subtree` 대상 경로와
허용 작업으로 active 규칙 하나를 선택하며 범위가 겹치면 무결성 검증에서
실패한다.

과거 창작·검수 결과는 생성 당시 규칙 ID·버전·SHA-256과 상태를 유지한다.
active 규칙 변경만으로 자동 재검수하거나 무효화하지 않고, 새 창작·수정은
현재 active 규칙을 사용한다. Packet이 지목한 active 파일 또는 archive
snapshot 자체가 전달한 버전·SHA-256과 다를 때만
`blocked_creative_rule_integrity`로 중단한다.

Task Packet에 프로젝트, Phase·작업 종류, 범위, 필수 근거, 사용자 사실·선택,
권한 경계, 금지사항 또는 기대 출력이 빠졌으면 전문 agent는
`blocked_missing_handoff`를 반환하고 작업을 시작하지 않는다. 메인 Codex는
이 상태가 해소되기 전에는 결과를 제시하거나 저장하지 않는다.

Task Packet 준비와 전문 실행은 같은 Minimal Source Rule을 사용한다. 문서
지도에서 정확한 canonical 경로를 확인한 뒤에는 전체 design 트리나 사용자가
지정하지 않은 승인·아이디어·결정·버전 기록을 예방적으로 탐색하지 않는다.

## 4. Project Boundary

- 모든 프로젝트 작업은 `docs/workflows/project_workspace.md`에 따라 대상 프로젝트를 먼저 결정한다.
- 새 프로젝트는 기존 프로젝트 폴더를 재사용하지 않고 완전한 독립 구조로 생성한다.
- 한 프로젝트의 아이디어, 승인 큐, 결정 로그와 버전 기록은 다른 프로젝트에서 사용하지 않는다.
- 여러 프로젝트가 존재하고 요청 대상이 불명확하면 변경 전에 사용자에게 확인한다.
- 공용 workflow, skill과 template만 `docs/`에서 공유한다.

## 5. Approval Boundary

Codex는 다음 작업을 승인 없이 수행할 수 있다.

- 문서 검색
- 요약
- 질문 생성
- 문서 요청 분기
- 자료 기반 기획서 초안 작성
- 변경안 초안 작성
- 명시적으로 허가된 기획 창작 대안 작성
- 승인 큐 항목 작성
- 충돌/영향도 분석
- planning-only 설정 설계에서 합의된 프로젝트 창작 규칙을 사용자의 명시적 구현 요청으로
  생성·개정. 이 규칙은 행동 설정이며 같은 요청으로 확정 design 문서를
  변경하지 않는다.

Codex는 다음 작업을 사용자 승인 없이 수행하지 않는다.

- `workspace/projects/<project_slug>/design/` 확정 문서 수정
- 승인 큐 항목을 적용 완료로 처리
- 결정 로그에 승인 결정을 기록
- 버전 기록에 반영 완료 기록

승인 항목이 에셋을 포함하면 `approved` 상태만으로 검토용 파일을 삭제하지
않는다. 적용 시 `design/assets/` 반영과 SHA-256 동일성, 승인·이력 문서의
canonical 경로 참조를 확인한 뒤 대응하는 `approvals/assets/` 파일을 삭제해야
`applied`로 전환할 수 있다.

## 6. Source Reconfirmation

승인된 변경안을 적용하기 전에는 대상 문서를 다시 읽는다.

- 승인 항목에는 작성 당시의 기준 Git 커밋, 대상 문서 경로, 비교 대상,
  원본 요약을 기록한다.
- 기존 문서 변경과 삭제는 기준 커밋의 비교 대상과 현재 내용을 비교한다.
- 대상 문서 내용이나 영향 범위가 변경안 작성 당시와 다르면 적용하지 않고
  `needs_reconfirmation` 항목으로 남긴다.
- 변경안에 대상 문서, 기준 커밋 또는 비교 대상이 불명확하면 적용하지 않고
  질문을 만든다.
- 신규 문서 생성은 동일 제목뿐 아니라 같은 주제나 역할의 문서가 이미
  생겼는지 먼저 확인한다.
- 재확인에서 불일치가 확인되면 기존 승인을 재사용하지 않는다.
- 불일치 항목은 승인 큐의 `Needs Reconfirmation` 영역으로 이동하며,
  갱신된 기준 정보와 초안에 대한 명시적 재승인 전에는 적용할 수 없다.
- `needs_reconfirmation` 항목은 `pending`, `approved`, `change_requested`,
  `on_hold`, `rejected` 중 하나로 전환한 뒤 후속 절차를 따른다.

## 7. Document Change Routing

문서 관련 요청은 신규 생성, 기존 문서 수정이나 삭제로 바로 확정하지 않는다.
Codex는 먼저 관련 문서를 검색하고 다음 중 하나로 분기한다.

분기 전에 `docs/workflows/document_structure.md`로 입력 단위별 canonical
document role과 원본 소유 문서를 정한다. `game_overview`는 상세 정보의 원본이
아니며 상세 문서의 요약과 링크를 제공한다.

- `create_new_document`: 독립 문서로 분리하는 것이 자연스러운 경우
- `update_existing_document`: 기존 확정 문서 갱신이 자연스러운 경우
- `restructure_documents`: 여러 문서 역할을 분리하거나 원자적으로 함께 갱신해야 하는 경우
- `delete_existing_document`: 기존 확정 문서 삭제를 안전하게 검토할 경우
- `compile_from_sources`: 자료 정리, 요약, 출처 묶음이 목적일 경우
- `draft_design_from_materials`: 기존 자료를 기획서 형식으로 구조화할 경우
- `draft_ingame_script`: 프로젝트 적응형 작가가 시나리오를 플레이어 노출
  대본과 씬 명세로 만들고 필요하면 서사 구조 개선까지 제안할 경우
- `ask_for_clarification`: 분기나 대상 문서 판단 근거가 부족한 경우

`restructure_documents`는 경로별 create/update/delete 작업을 하나의 승인
항목으로 관리한다. 적용 전 모든 대상을 재확인하며 일부 문서만 적용하지 않는다.
확정 문서의 목록·경로·역할이나 한 문장 담당 범위가 바뀌면 프로젝트 루트
README, `design/README.md`와 game overview의 영향받는 링크·설명을 같은 승인
범위에 포함한다. 프로젝트 README는 탐색용 파생 색인이며 상세 사실을 소유하지 않는다.

신규·수정·재구성 비시나리오 Draft는 `design_creative_planner`의 `classify`
Phase에서 누락을 `creative_fillable`, `user_fact`, `dependency` GAP으로
분류한다. 메인 Codex가 창작 가능한 GAP을 먼저 보여주고, 사용자의 명시적 허가
후 정확한 GAP ID와 active 프로젝트 창작 규칙만 `generate_options` Phase에
전달한다. 규칙이 요구한 비시나리오 독립 검수는
`design_creative_reviewer`가 수행한다. 선택된 안만
`incorporate_selection` Phase에서 `CP-*` 각주와 Creative Proposal Log를 갖춘
Draft에 넣는다. 실제 프로젝트 사실은 창작하지 않고, 밸런스 수치는 검증
조건이 있는 `provisional` 가설로 둔다. 창작안 선택은 승인이 아니며 원본
재확인과 갱신된 `pending` 검토를 거친다.

일반 시나리오 작성·변경은 `scenario_designer`가
`docs/skills/scenario_review.md`를 적용한다. 요청 원안에 따른 Draft와 더 나은
사건 순서·공개 시점·분기·Outcome의 이유·영향을 분리하고,
active 일반 시나리오 창작 규칙을 적용한 뒤 `scenario_reviewer`가 독립
검수한다. 사용자가 권고를 선택한 뒤에도 원본
재확인, 작성자 갱신과 재검수를 거쳐 `pending`으로 다시 검토받기 전에는 승인
대상이나 canonical 내용이 아니다.

인게임 스크립트는 `scenario_writer`가 작성하고 `scenario_reviewer`가 독립
검수하며 active 인게임 스크립트 창작 규칙과
`docs/workflows/write_ingame_script.md`를 따른다. 구체 창작은 `CW-*`,
원본 구조 변경은 `NR-*`로 공개한다. 상위 시나리오 변경은 스크립트·링크와
하나의 `restructure` 항목으로 관리하고 승인 전에는 `design/narrative/`에
저장하지 않는다. 세계관 정사·시스템 규칙 변경 의존성은 별도 고위험 항목으로
분리한다.

## 8. Operating Model

이 저장소는 런타임 제품이 아니지만 Python 표준 라이브러리 기반의 결정적
검증 코드를 제공한다. 자동 테스트는 문서 구조, 승인 참조, 링크와 테스트
출처·격리 불변 조건을 검사하고, 창작 품질과 실제 에이전트 동작은 체크리스트와
격리된 스모크 테스트로 확인한다.

기본 검증 기준:

- 요청 유형에 맞는 workflow를 따랐는가
- 산출물이 template 형식을 따르는가
- 합성 동작 테스트가 전용 픽스처 또는 `/tmp` 임시 복사본에서 실행되고
  출처 표시와 원본 불변을 유지했는가
- 승인 전 확정 문서가 수정되지 않았는가
- 승인 후 Decision Log와 Version History가 함께 갱신되었는가
- 임시 아이디어가 승인 제안으로 전환되어도 명시적 승인 전 확정 문서를
  수정하지 않았는가
- 일반 시나리오 Draft와 미선택 개선 권고가 분리되어 있는가
- 선택된 개선 권고가 원본 재확인과 갱신된 `pending` 승인을 거치는가
- 기획 GAP이 유형별로 분류되고 명시적 허가 전에는 창작 대안이 생성되지 않는가
- 선택된 기획 창작만 `CP-*`로 Draft에 포함되고 선택 후 다시 `pending`을 거치는가
- 창작 작업에 규칙 기준과 정확한 프로젝트 규칙 ID·경로·버전·SHA-256,
  검수 계약이 전달되었는가
- 규칙 없음·적용 범위 불일치·참조 무결성 불일치 상태에서 창작 결과가
  생성되지 않았는가
- `user_fact`는 `TBD`, 검증 전 수치는 `provisional`과 검증 조건을 유지하는가
- 모든 검색·승인·결정·버전 기록이 같은 프로젝트 ID와 루트를 사용하는가
