# Architecture

## 1. Overview

GamePM Codex Workspace는 코드 실행 제품이 아니라 문서 기반 작업 환경이다.

```text
User
  -> Codex 입력창
    -> AGENTS.md
    -> docs/workflows/
    -> docs/skills/
    -> docs/templates/
    -> workspace/
```

Codex가 에이전트 실행부 역할을 하고, 이 저장소의 Markdown 파일들이 규칙, 메모리, 승인 상태, 산출물 역할을 한다.

## 2. Directory Roles

### `docs/workflows/`

작업 절차를 정의한다. Codex는 요청 유형에 맞는 workflow를 먼저 확인한 뒤 작업한다.
문서 관련 요청은 먼저 `document_change` workflow에서 검색과 분기를 수행한 뒤,
필요한 하위 workflow로 이동한다.

### `docs/skills/`

반복적으로 쓰는 판단 기준과 품질 규칙을 정의한다. 예: 충돌 검토, 문서 보완 질문, 한국어 기획 문체.

### `docs/templates/`

산출물 형식을 정의한다. 승인 큐, 변경안, 기획서, 결정 로그, 버전 기록은 템플릿을 따른다.

### `workspace/`

실제 프로젝트 상태를 저장한다.

- `design/`: 승인된 확정 기획 문서
- `ideas/`: 임시 아이디어
- `approvals/`: 승인 대기 변경안
- `decisions/`: 결정 로그
- `versions/`: 버전 기록

### `docs/dev-log/`

과거 개발 기록 보관용이다. 현재 아키텍처, 행동 규칙, workflow 정책의 근거로 사용하지 않는다.

## 3. Approval Boundary

Codex는 다음 작업을 승인 없이 수행할 수 있다.

- 문서 검색
- 요약
- 질문 생성
- 문서 요청 분기
- 자료 기반 기획서 초안 작성
- 변경안 초안 작성
- 승인 큐 항목 작성
- 충돌/영향도 분석

Codex는 다음 작업을 사용자 승인 없이 수행하지 않는다.

- `workspace/design/` 확정 문서 수정
- 승인 큐 항목을 적용 완료로 처리
- 결정 로그에 승인 결정을 기록
- 버전 기록에 반영 완료 기록

## 4. Source Reconfirmation

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

## 5. Document Change Routing

문서 관련 요청은 신규 생성이나 기존 문서 수정으로 바로 확정하지 않는다.
Codex는 먼저 관련 문서를 검색하고 다음 중 하나로 분기한다.

- `create_new_document`: 독립 문서로 분리하는 것이 자연스러운 경우
- `update_existing_document`: 기존 확정 문서 갱신이 자연스러운 경우
- `compile_from_sources`: 자료 정리, 요약, 출처 묶음이 목적일 경우
- `draft_design_from_materials`: 기존 자료를 기획서 형식으로 구조화할 경우
- `ask_for_clarification`: 분기나 대상 문서 판단 근거가 부족한 경우

## 6. Operating Model

이 저장소는 테스트 가능한 Python 패키지를 제공하지 않는다. 품질 관리는 문서 구조와 운영 규칙으로 한다.

기본 검증 기준:

- 요청 유형에 맞는 workflow를 따랐는가
- 산출물이 template 형식을 따르는가
- 승인 전 확정 문서가 수정되지 않았는가
- 승인 후 Decision Log와 Version History가 함께 갱신되었는가
