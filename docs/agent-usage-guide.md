# Agent 사용 가이드

## Summary

이 프로젝트에는 두 종류의 반복 작업 규칙이 있다.

- `docs/*-agent.md`: 프로젝트 안에 남기는 설계 원본 문서
- Codex skill: 다른 세션에서 바로 호출할 수 있는 실행 규칙
- `.codex/agents/*.toml`: 역할별 서브에이전트 권한과 책임
- `.agents/skills/*/SKILL.md`: 요청 분석부터 검증과 Wiki 작업까지의 workflow skill

지금부터 계획, 검증, 문서 관리는 skill을 우선 사용한다. 문서형 Agent는 skill의 근거와 Wiki/PR 공유용 원본으로 둔다.

## 변환된 skill

| Skill | 원본 문서 | 사용 시점 |
|---|---|---|
| `project-planning-agent` | `docs/planning-agent.md` | 요구사항을 Task, 우선순위, 완료 기준으로 나눌 때 |
| `project-verification-agent` | `docs/verification-agent.md` | 구현 결과, PR, Issue 완료 여부를 검증할 때 |
| `project-document-manager` | `docs/document-management-agent.md` | 문서 추가/수정/삭제와 링크 갱신을 점검할 때 |
| `project-learning-agent` | `docs/learning/README.md` | 구현 후 학습 키워드, 참고 코드, ChatGPT 질문 예시를 짧게 정리할 때 |
| `xp-desktop-pet-ui` | `docs/codex-skills/xp-desktop-pet-ui/` | XP 데스크톱 UI, 매니저 창, 에셋, copy 규칙을 다룰 때 |
| `tdd-test-writing` | `docs/tdd-workflow-agent.md` | 작은 도메인 규칙을 RED/GREEN/REFACTOR로 반복 구현할 때 |

## 하네스 역할

| Role | 설정 | 원칙 |
|---|---|---|
| researcher | `.codex/agents/researcher.toml` | 읽기 전용 조사 |
| planner | `.codex/agents/planner.toml` | 파일 단위 계획과 승인 지점 정리 |
| implementer | `.codex/agents/implementer.toml` | 승인된 계획만 최소 구현 |
| verifier | `.codex/agents/verifier.toml` | 독립 검증과 실패 증거 보고 |
| wiki_curator | `.codex/agents/wiki_curator.toml` | 승인된 Wiki 영역만 갱신 |
| tdd_workflow | `.codex/agents/tdd_workflow.toml` | 작은 spec을 RED/GREEN/REFACTOR로 구현하고 verifier에 넘김 |

## 하네스 workflow skill

| Skill | 위치 | 사용 시점 |
|---|---|---|
| `analyze-request` | `.agents/skills/analyze-request/SKILL.md` | 요청을 목표, 제약, 수용 조건으로 정리할 때 |
| `create-plan` | `.agents/skills/create-plan/SKILL.md` | 승인 전 파일 단위 계획을 만들 때 |
| `execute-plan` | `.agents/skills/execute-plan/SKILL.md` | 승인된 한 단계만 구현할 때 |
| `verify-result` | `.agents/skills/verify-result/SKILL.md` | 구현 후 독립 검증할 때 |
| `wiki-ingest` | `.agents/skills/wiki-ingest/SKILL.md` | 승인된 원본을 Wiki에 반영할 때 |
| `wiki-query` | `.agents/skills/wiki-query/SKILL.md` | Wiki에서 근거 기반으로 답할 때 |
| `wiki-lint` | `.agents/skills/wiki-lint/SKILL.md` | Wiki 링크, 출처, index, log를 검사할 때 |
| `tdd-test-writing` | `.agents/skills/tdd-test-writing/SKILL.md` | 반복적인 테스트 작성 절차를 spec, RED, GREEN, refactor로 정리할 때 |

## Codex `/` 호출 이름

아래 이름은 `C:\Users\sun99\.codex\skills`에 설치된 skill 이름이다. Codex에서 `/` 메뉴가 skill을 노출하는 환경이면 같은 이름으로 호출한다. 새로 설치한 skill은 다음 턴 또는 새 세션부터 안정적으로 보일 수 있다.

### 프로젝트 전용

| 호출 이름 | 용도 |
|---|---|
| `/project-planning-agent` | 요구사항을 Task, 우선순위, 완료 기준으로 분해 |
| `/project-verification-agent` | 구현 결과와 MVP/수직 슬라이스 검증 |
| `/project-document-manager` | 문서 위치, 링크, 중복 역할 점검 |
| `/project-learning-agent` | 학습 키워드, 참고 코드, ChatGPT 질문 정리 |
| `/xp-desktop-pet-ui` | XP 데스크톱 UI와 에셋 규칙 적용 |

### 하네스 workflow

| 호출 이름 | 용도 |
|---|---|
| `/analyze-request` | 요청을 목표, 제약, 위험, 수용 조건으로 정리 |
| `/create-plan` | 승인 전 파일 단위 계획 작성 |
| `/execute-plan` | 승인된 계획의 한 단계만 구현 |
| `/verify-result` | 구현 후 독립 검증 |
| `/wiki-ingest` | 승인된 원본을 Wiki에 반영 |
| `/wiki-query` | Wiki에서 근거 기반으로 질의 응답 |
| `/wiki-lint` | Wiki 링크, 출처, index, log 검사 |

### Superpowers

| 호출 이름 | 용도 |
|---|---|
| `/using-superpowers` | Superpowers skill 사용 원칙 확인 |
| `/brainstorming` | 요구사항 탐색과 대안 발산 |
| `/writing-plans` | 구현 계획 작성 |
| `/executing-plans` | 작성된 계획 실행 |
| `/test-driven-development` | 동작 변경 전 테스트 우선 접근 |
| `/tdd-test-writing` | 프로젝트 반복 TDD spec 작성 절차 |
| `/systematic-debugging` | 원인 불명 실패의 체계적 디버깅 |
| `/verification-before-completion` | 완료 선언 전 검증 강제 |
| `/requesting-code-review` | 구현 후 코드 리뷰 요청 |
| `/receiving-code-review` | 리뷰 피드백 반영 |
| `/dispatching-parallel-agents` | 독립 조사/작업 병렬화 |
| `/subagent-driven-development` | 승인된 작은 작업을 서브에이전트로 분할 |
| `/using-git-worktrees` | 격리된 큰 변경을 worktree로 수행 |
| `/finishing-a-development-branch` | 브랜치 마무리 점검 |
| `/writing-skills` | 새 skill 작성 |

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

## 학습 정리 프롬프트

```text
project-learning-agent skill을 사용해.
이번 구현/문서 작업에서 공부할 키워드를 docs/learning에 짧게 정리해줘.
줄글 설명은 쓰지 말고, 키워드 + 왜 필요한지 한 줄 + 참고 코드 위치 + ChatGPT 질문 예시만 남겨줘.

작업 내용:
[여기에 구현 또는 문서 작업 내용]
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
3. 테스트 가능한 도메인 규칙은 `tdd-test-writing`과 `tdd_workflow`로 RED/GREEN을 먼저 만든다.
4. 구현 후 `project-verification-agent`로 기능과 데이터 흐름을 검증한다.
5. 새로 공부할 개념이 생기면 `project-learning-agent`로 `docs/learning/`을 짧게 갱신한다.
6. 문서 변경이 있으면 `project-document-manager`로 링크와 역할 중복을 점검한다.
7. 결과를 `docs/status.md`, `docs/tasks.md`, GitHub Issues/Projects에 반영한다.

## 주의

- skill은 다음 세션부터 자동 목록에 보일 수 있다. 현재 세션에서 새 skill이 보이지 않으면 파일 경로를 직접 언급해서 사용한다.
- 문서형 Agent는 삭제하지 않는다. skill의 근거이자 멘토/리뷰어 공유용 문서다.
- GitHub Project 운영은 `docs/github-project-guide.md`를 따른다.
- `docs/notion-dashboard-guide.md`는 오래된 문서이며 현재 작업 보드 기준으로 사용하지 않는다.
- Superpowers는 `C:\Users\sun99\.codex\skills`에 설치되어 있다. 다만 프로젝트 고유 제약은 `AGENTS.md`, `.codex/agents`, `.agents/skills`, `docs/codex-skills`를 우선한다.
- API Key, token, password, Supabase Key, 개인 일정, 학교/위치 정보는 문서와 Issue에 넣지 않는다.
