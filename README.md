# GamePM Codex Workspace

이 저장소는 OpenAI API로 실행되는 별도 제품이 아니라, Codex가 이 폴더의 규칙과 문서를 읽고 게임 기획 작업을 수행하는 로컬 문서형 에이전트 작업장이다.

Codex는 문서 요청 분기, 자료 기반 기획서 초안 작성, 변경안 생성, 충돌
검토, 승인 큐 정리, 결정 로그 작성, 버전 기록 초안 생성을 돕는다.
단, 확정 문서는 사용자의 명시적 승인 이후에만 수정한다.

## Core Principle

### Human in the Loop

- Codex는 분석, 초안, 변경안, 질문, 검토 결과를 만든다.
- 승인 전 산출물은 `workspace/approvals/approval_queue.md`에 둘 초안으로 취급한다.
- 사용자가 명시적으로 승인하기 전에는 `workspace/design/`의 확정 문서를 수정하지 않는다.
- 승인된 변경은 Decision Log와 Version History에 함께 기록한다.

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
workspace/approvals/approval_queue.md의 첫 번째 항목을 승인할게.
승인 흐름에 따라 확정 문서, 결정 로그, 버전 기록을 갱신해줘.
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
  project_brief.md
  design/
  ideas/
  approvals/
  decisions/
  versions/
```

## Important References

- `AGENTS.md`: Codex가 이 저장소에서 반드시 지켜야 하는 전체 규칙
- `docs/workflows/`: 작업별 실행 절차. 문서 관련 요청은 `document_change`를 먼저 따른다.
- `docs/workflows/temporary_idea.md`: 임시 아이디어 등록·수정·승인 제안 전환 절차
- `docs/templates/`: 승인 큐, 기획서, 결정 로그, 버전 기록 템플릿
- `docs/skills/`: 반복 작업에 적용할 전문 규칙
- `workspace/`: 실제 프로젝트 문서와 작업 상태

`docs/dev-log/`는 과거 개발 기록 보관용이다. 현재 행동 규칙, 아키텍처, 워크플로우 판단에는 사용하지 않는다.

## Verification

이 저장소에는 기본 Python 테스트나 런타임 의존성이 없다. 변경 후에는 다음을 확인한다.

- 승인 전 확정 문서를 수정하지 않았는가
- 변경안이 승인 큐 형식으로 작성되었는가
- 승인된 변경에 Decision Log와 Version History 기록이 남았는가
- 임시 아이디어 등록과 승인 제안 전환이 확정 문서와 분리되었는가
- 문서 관련 요청이 검색 후 생성, 수정, 삭제, 자료 취합, 기획서화, 질문으로 분기되었는가
- 기획 문서와 변경안이 `docs/templates/`의 형식을 따르는가
