# Agent 사용 가이드

## Summary

이 프로젝트에는 두 종류의 반복 작업 규칙이 있다.

- `docs/*-agent.md`: 프로젝트 안에 남기는 설계 원본 문서
- Codex skill: 다른 세션에서 바로 호출할 수 있는 실행 규칙

지금부터 계획, 검증, 문서 관리는 skill을 우선 사용한다. 문서형 Agent는 skill의 근거와 Wiki/PR 공유용 원본으로 둔다.

## 변환된 skill

| Skill | 원본 문서 | 사용 시점 |
|---|---|---|
| `project-planning-agent` | `docs/planning-agent.md` | 요구사항을 Task, 우선순위, 완료 기준으로 나눌 때 |
| `project-verification-agent` | `docs/verification-agent.md` | 구현 결과, PR, Issue 완료 여부를 검증할 때 |
| `project-document-manager` | `docs/document-management-agent.md` | 문서 추가/수정/삭제와 링크 갱신을 점검할 때 |
| `xp-desktop-pet-ui` | `docs/codex-skills/xp-desktop-pet-ui/` | XP 데스크톱 UI, 매니저 창, 에셋, copy 규칙을 다룰 때 |

## 다른 세션 시작 프롬프트

```text
D:\2026.1\AIAgentChallenge\hub 프로젝트를 이어서 작업할 거야.
먼저 AGENTS.md, docs/README.md, docs/project-knowledge-map.md, docs/status.md, docs/master-plan.md, docs/tasks.md를 읽어.
필요한 작업에 맞춰 project-planning-agent, project-verification-agent, project-document-manager, xp-desktop-pet-ui skill을 사용해.
```

## 계획 작업 프롬프트

```text
project-planning-agent skill을 사용해.
아래 요구사항을 오늘 할 일, 이번 주 할 일, 이후 할 일, P3 확장 후보로 나누고 GitHub Issue로 옮길 수 있는 Task 목록과 완료 기준을 만들어줘.

요구사항:
[여기에 요구사항]
```

## 검증 작업 프롬프트

```text
project-verification-agent skill을 사용해.
아래 변경이 MVP 기능 명세와 수직 슬라이스 요구사항을 만족하는지 검증해줘.
빌드 성공, 수동 시나리오, 데이터 저장 여부를 분리해서 통과/실패/확인 필요로 정리해줘.

검증 대상:
[기능 또는 변경 파일]
```

## 문서 관리 프롬프트

```text
project-document-manager skill을 사용해.
아래 문서 변경 요청이 현재 문서 구조를 깨지 않는지 판단하고, 수정해야 할 상위 링크와 중복 가능성을 점검해줘.
아직 파일을 수정하지 말고 먼저 판단을 제시해줘.

문서 변경 요청:
[문서 작업 내용]
```

## UI/에셋 작업 프롬프트

```text
xp-desktop-pet-ui skill을 사용해.
React 화면을 static HTML 기준과 XP 데스크톱 디자인 시스템에 맞춰 수정해줘.
visible UI에 미구현 확장 기능이나 개발자용 레이어명은 노출하지 마.

작업 요청:
[UI/디자인/에셋 작업]
```

## 사용 순서

1. 큰 작업은 `project-planning-agent`로 Task와 우선순위를 정한다.
2. UI/디자인 작업은 `xp-desktop-pet-ui`를 함께 사용한다.
3. 구현 후 `project-verification-agent`로 기능과 데이터 흐름을 검증한다.
4. 문서 변경이 있으면 `project-document-manager`로 링크와 역할 중복을 점검한다.
5. 결과를 `docs/status.md`, `docs/tasks.md`, GitHub Issues/Projects에 반영한다.

## 주의

- skill은 다음 세션부터 자동 목록에 보일 수 있다. 현재 세션에서 새 skill이 보이지 않으면 파일 경로를 직접 언급해서 사용한다.
- 문서형 Agent는 삭제하지 않는다. skill의 근거이자 멘토/리뷰어 공유용 문서다.
- GitHub Project 운영은 `docs/github-project-guide.md`를 따른다.
- API Key, token, password, Supabase Key, 개인 일정, 학교/위치 정보는 문서와 Issue에 넣지 않는다.