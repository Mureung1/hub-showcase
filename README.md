# GamePM Codex Workspace

이 저장소는 OpenAI API로 실행되는 별도 제품이 아니라, Codex가 이 폴더의 규칙과 문서를 읽고 게임 기획 작업을 수행하는 로컬 문서형 에이전트 작업장이다.

Codex는 문서 요청 분기, 자료 기반 기획서 초안 작성, 변경안 생성, 충돌
검토, 승인 큐 정리, 결정 로그 작성, 버전 기록 초안 생성을 돕는다.
단, 확정 문서는 사용자의 명시적 승인 이후에만 수정한다.

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
- 보류·수정 요청·거부 결정은 기존 초안과 결정 이력을 덮어쓰지 않고
  Decision Log에 기록한다.
- 수정 대상이나 핵심 범위가 달라지면 기존 항목을 보존하고 연결된 새 승인
  항목을 만든다.

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
      project_brief.md
      design/
      ideas/
      approvals/
      decisions/
      versions/
```

## Important References

- `AGENTS.md`: Codex가 이 저장소에서 반드시 지켜야 하는 전체 규칙
- `docs/workflows/project_workspace.md`: 대상 프로젝트 선택과 새 프로젝트 생성·분리 절차
- `docs/workflows/`: 작업별 실행 절차. 문서 관련 요청은 `document_change`를 먼저 따른다.
- `docs/workflows/temporary_idea.md`: 임시 아이디어 등록·수정·승인 제안 전환 절차
- `docs/workflows/approval_queue.md`: 승인 상태 전환, 원본 재확인, 승인 적용 절차
- `docs/checklist.md`: 구조 확인과 시나리오 기반 workflow 검증 기준
- `docs/templates/`: 승인 큐, 기획서, 결정 로그, 버전 기록 템플릿
- `docs/skills/`: 반복 작업에 적용할 전문 규칙
- `workspace/project_registry.md`: 프로젝트 목록과 현재 기본 프로젝트
- `workspace/projects/`: 프로젝트별 실제 기획 문서와 작업 상태

`docs/dev-log/`는 과거 개발 기록 보관용이다. 현재 행동 규칙, 아키텍처, 워크플로우 판단에는 사용하지 않는다.

## Verification

이 저장소에는 기본 Python 테스트나 런타임 의존성이 없다. 변경 후에는 다음을 확인한다.

- 승인 전 확정 문서를 수정하지 않았는가
- 변경안이 승인 큐 형식으로 작성되었는가
- 승인된 변경에 Decision Log와 Version History 기록이 남았는가
- 임시 아이디어 등록과 승인 제안 전환이 확정 문서와 분리되었는가
- 문서 관련 요청이 검색 후 생성, 수정, 삭제, 자료 취합, 기획서화, 질문으로 분기되었는가
- 승인 항목에 기준 Git 커밋, 대상 경로, 비교 대상과 원본 요약이 있는가
- 원본 불일치 시 적용을 중단하고 `needs_reconfirmation`으로 이동했는가
- 보류·수정 요청·거부의 상태와 결정 이력이 보존되었는가
- 삭제 전 영향과 대체 문서를 검토하고 승인 후 `delete` 기록을 남겼는가
- `docs/checklist.md`의 시나리오 항목을 실제 검증 없이 완료 표시하지 않았는가
- 기획 문서와 변경안이 `docs/templates/`의 형식을 따르는가
- 모든 프로젝트 자료와 승인·결정·버전 기록이 올바른 프로젝트 폴더 안에 있는가
