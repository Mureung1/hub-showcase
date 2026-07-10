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
- [문서 관계 지도](docs/project-knowledge-map.md)
- [Codex 작업 규칙](AGENTS.md)

세부 기획, 와이어프레임, MVP 기능 명세, 디자인 시스템, 에셋 프롬프트, 4주 계획은 [docs/README.md](docs/README.md)에서 접근합니다.

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

## Wiki

GitHub Wiki는 코드 PR에 직접 포함되지 않으므로 PR 본문에 별도로 연결합니다.

- Wiki: https://github.com/YIFNEN/hub/wiki
