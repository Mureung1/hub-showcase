# AGENTS.md

이 저장소는 Windows XP 데스크톱형 전자 생물 매니저 MVP를 만드는 React + TypeScript + Vite 프로젝트다. 정적 HTML은 시각 기준안이고, React 버전은 실제 확장 구현 타깃이다.

## 시작 전 확인

- `git -c safe.directory=D:/2026.1/AIAgentChallenge/hub status --short`
- `git -c safe.directory=D:/2026.1/AIAgentChallenge/hub branch --show-current`
- `docs/status.md`
- 요청과 관련된 문서

## 설치·실행·검증 명령

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
```

빌드와 검증은 사용자가 요청하거나 승인한 경우에만 실행한다.

## 절대 규칙

- 기존 사용자 변경을 되돌리지 않는다.
- TypeScript `any`를 추가하지 않는다.
- 사용자 요청 없는 패키지 추가, 전면 리팩터링, 파일 이동/삭제를 하지 않는다.
- API Key, token, password, Supabase Key, 개인 일정, 학교/위치 정보는 문서나 코드에 기록하지 않는다.
- 허가 없이 commit, push, merge, PR 생성, 배포를 하지 않는다.
- `node_modules/`, `dist/`, `.git/`, `.env`, 대형 바이너리, 적용 에셋은 자동 수정하지 않는다.
- 미구현 기능을 완료로 기록하지 않는다.

## 공식 위치

- 문서 허브: `docs/README.md`
- 문서 관계 지도: `docs/project-knowledge-map.md`
- 현재 상태: `docs/status.md`
- 백로그: `docs/tasks.md`
- 활성 계획: `docs/plans/active/`
- 프로젝트 Wiki: `docs/wiki/`
- Codex 역할 설정: `.codex/agents/`
- 프로젝트 workflow skills: `.agents/skills/`
- repo-side skill 문서: `docs/codex-skills/`

`docs/notion-dashboard-guide.md`는 오래된 문서이며 현재 공식 작업 흐름으로 사용하지 않는다.

## 핵심 문서

- 최종 로드맵: `docs/master-plan.md`
- MVP 기능 명세: `docs/mvp-functional-spec.md`
- 사용자 흐름: `docs/user-flow-wireframes.md`
- 디자인 시스템: `docs/design-system.md`
- Agent 사용 가이드: `docs/agent-usage-guide.md`
- GitHub Project 운영: `docs/github-project-guide.md`
- 학습 인덱스: `docs/learning/README.md`

## 에이전트와 Skill 원칙

- 조사와 검증은 읽기 전용 역할을 우선 사용한다.
- 구현은 승인된 계획의 지정 파일 범위 안에서만 수행한다.
- 같은 파일 영역을 여러 쓰기 에이전트가 동시에 수정하지 않는다.
- 구현 에이전트는 스스로 최종 완료를 승인하지 않는다.
- 반복 절차는 `.agents/skills/*/SKILL.md` 또는 `docs/codex-skills/*/SKILL.md`를 따른다.
- Superpowers는 `C:\Users\sun99\.codex\skills`에 설치되어 있으며, 프로젝트 규칙과 충돌하면 이 파일과 승인된 계획을 우선한다.

## 완료 전 확인

- 변경 범위가 승인된 계획과 일치한다.
- 하네스 변경은 `scripts/verify-harness.ps1`로 확인한다.
- 앱 변경은 `npm.cmd run typecheck`와 승인 시 `npm.cmd run build`로 확인한다.
- 구현, 검증, 문서 갱신 결과를 분리해서 보고한다.
- 세션 종료 시 `docs/status.md`를 실제 결과로 갱신한다.
