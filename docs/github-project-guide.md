# GitHub Project 운영 가이드

## Summary

개발 Task는 GitHub Issues와 GitHub Projects로 관리한다. Notion은 회고, 멘토링 메모, 넓은 운영 기록에 사용하고, 실제 개발 실행 상태는 GitHub Project를 기준으로 본다.

- GitHub Issues: https://github.com/YIFNEN/hub/issues
- GitHub Project: https://github.com/users/YIFNEN/projects/1

## 역할 분담

| 도구 | 역할 |
|---|---|
| GitHub Issues | 개발 Task의 실제 실행 단위 |
| GitHub Project | Issue 상태, 우선순위, 순서 관리 |
| docs/tasks.md | 백로그 원본과 완료 기준 기록 |
| Wiki | 멘토와 리뷰어에게 보여줄 정리 문서 |
| Notion | 회고, 멘토링 질문, 개인 운영 메모 |

## Project 형식

권장 템플릿은 Kanban이다.

컬럼은 아래 상태로 관리한다.

```text
Backlog -> Ready -> In Progress -> Review -> Done
```

## 필드

GitHub Project에 아래 필드를 둔다.

| 필드 | 값 | 의미 |
|---|---|---|
| Priority | P0, P1, P2, P3 | 중요도 |
| Week | 2주차, 3주차, 4주차 | 작업 주차 |
| Type | Frontend, Backend, DB, Docs, Verification, Design | 작업 성격 |
| Status | Backlog, Ready, In Progress, Review, Done | 진행 상태 |

## Issue 제목 규칙

Issue 제목에 우선순위와 주차를 표시한다.

```text
[P0][2주차] React 화면을 HTML 기준으로 컴포넌트 분해
[P0][2주차] quest_logs 테이블 스키마 설계
```

## Issue 본문 규칙

각 Issue에는 아래 항목을 둔다.

```md
## 무엇
작업 내용을 짧게 적는다.

## 완료 기준
- 완료 여부를 검증할 수 있는 기준을 적는다.

## 우선순위
P0

## 상태
Ready

## 연결 문서
- docs/tasks.md
- docs/master-plan.md
```

## 우선순위와 순서 표시

우선순위는 두 곳에 표시한다.

1. Issue 제목의 `[P0]`, `[P1]` prefix
2. GitHub Project의 `Priority` 필드

작업 순서는 Project 보드에서 카드 위치로 표시한다. 같은 `Ready` 컬럼 안에서는 위에 있을수록 먼저 처리한다.

## PR 연결

PR 본문에 Issue 번호를 연결한다.

```md
Closes #1
Closes #2
```

PR이 merge되면 연결된 Issue를 닫고 Project 상태를 `Done`으로 옮긴다.

## docs/tasks.md와의 관계

- `docs/tasks.md`는 전체 백로그와 완료 기준을 보존한다.
- GitHub Issues는 실제 실행 단위다.
- GitHub Project는 진행 상태와 우선순위를 보여주는 보드다.
- 새 작업을 만들면 먼저 `docs/tasks.md`에 반영하고, 실행할 작업만 Issue로 만든다.