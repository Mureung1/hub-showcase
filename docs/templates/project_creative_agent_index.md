# Project Creative Agents

- 프로젝트 ID: `<project_slug>`
- 역할: 프로젝트별 창작 행동 규칙 색인
- canonical detail owner: `아님`

이 문서는 실제로 존재하는 프로젝트 창작 규칙만 연결한다. 게임 설정이나
규칙의 상세 사실을 기록하지 않는다.

## Rules

| 프로젝트 창작 에이전트 ID | 분야 | canonical role | 기본 agent_type | 검수 정책 | 버전 | 상태 | 규칙 |
|---|---|---|---|---|---:|---|---|
| `PCA-<project_slug>-<rule_slug>` |  |  |  |  | 1 | `active` | [규칙](rules/<rule_slug>.md) |

## Maintenance Rules

- 규칙 생성·개정·retire는
  `docs/workflows/project_creative_agent_setup.md`의 Plan mode와 명시적 구현
  요청을 거친다.
- 분야별 규칙을 이 문서에 복제하지 않고 한 줄 색인과 상대경로 링크만 둔다.
- 다른 프로젝트의 규칙을 연결하거나 복사하지 않는다.
- active 규칙의 버전, 상태와 경로가 실제 파일과 일치해야 한다.
