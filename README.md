# 전자 매니저 키우기

사용자의 장기 목표를 오늘 수행 가능한 퀘스트로 나누고, 전자 생물 매니저와 함께 성장하는 Windows XP 데스크톱형 웹앱 프로토타입입니다.

## 실행 방법

```powershell
cd D:\2026.1\AIAgentChallenge\hub
npm.cmd install
npm.cmd run dev
```

React MVP:

```text
http://localhost:5173/
```

정적 HTML/CSS 미리보기:

```text
http://localhost:5173/prototype-static.html
```

## 문서

- [문서 허브](docs/README.md)
- [7월 30일 최종 로드맵](docs/master-plan.md)
- [오늘 계획](docs/today-plan-2026-07-13.md)
- [2주차 계획](docs/weekly-plan-2026-07-13.md)
- [개발 Task 백로그](docs/tasks.md)
- [계획 수립 Agent](docs/planning-agent.md)
- [기능 검증 Agent](docs/verification-agent.md)
- [문서 관리 Agent](docs/document-management-agent.md)
- [Agent 사용 가이드](docs/agent-usage-guide.md)
- [GitHub Project 운영 가이드](docs/github-project-guide.md)
- [문서 관계 지도](docs/project-knowledge-map.md)
- [Codex 작업 규칙](AGENTS.md)

세부 기획, 와이어프레임, MVP 기능 명세, 디자인 시스템, 에셋 프롬프트, 확장 계획은 [docs/README.md](docs/README.md)에서 접근합니다.

## 핵심 흐름

```text
Profile Setup Wizard
-> XP Desktop
-> 오늘의 퀘스트 수정/수락
-> QuestRunner.exe 실행
-> 완료/실패 처리
-> EXP 성장 또는 복구 퀘스트 제안
-> 기록 노트 저장
```

## 현재 구현 판단

- 정적 HTML 버전은 시각 목표와 클릭 흐름의 기준안입니다.
- React 버전은 실제 확장 구현 타깃입니다.
- 다음 구현은 정적 HTML의 XP 화면 구조를 React 컴포넌트로 이식하고, 기존 React 상태 전이 로직을 선별 재사용하는 방향입니다.

## 운영 링크

- GitHub Issues: https://github.com/YIFNEN/hub/issues
- GitHub Project: https://github.com/users/YIFNEN/projects/1
- Wiki: https://github.com/YIFNEN/hub/wiki