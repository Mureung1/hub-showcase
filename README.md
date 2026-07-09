# 전자 매니저 키우기

사용자의 장기 목표를 오늘 수행 가능한 퀘스트로 나누고, 퀘스트 수행 결과에 따라 전자 생물 매니저와 함께 성장하는 XP 데스크톱형 웹앱 프로토타입입니다.

현재 MVP는 `React + Vite + TypeScript` 기반으로 구현하며, Windows XP 데스크톱처럼 보이는 화면에서 `프로필 입력 -> 오늘의 퀘스트 -> QuestRunner.exe -> 완료/실패 -> 복구 퀘스트` 흐름을 제공합니다.

## 프로토타입 확인

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

정적 미리보기 파일:

- [public/prototype-static.html](public/prototype-static.html)

## 문서 목록

모든 기획/설계/진행 문서는 아래 링크에서 접근할 수 있습니다.

| 문서 | 역할 |
|---|---|
| [docs/README.md](docs/README.md) | 문서 허브, 문서 역할, Wiki/프로토타입 확인 방법 |
| [docs/product-plan.md](docs/product-plan.md) | 문제 정의, 사용자 시나리오, 핵심 기능, MVP 범위 |
| [docs/user-flow-wireframes.md](docs/user-flow-wireframes.md) | User Flow, 화면 목록, 와이어프레임 |
| [docs/xp-desktop-mvp-spec.md](docs/xp-desktop-mvp-spec.md) | XP 데스크톱형 MVP 구현 명세 |
| [docs/agent-design.md](docs/agent-design.md) | AI Agent 역할, MVP 규칙 기반 동작, 확장 방향 |
| [docs/four-week-roadmap.md](docs/four-week-roadmap.md) | 7월 10일/17일/24일/30일 기준 4주 작업 계획 |
| [docs/status.md](docs/status.md) | 현재 진행 상황, 확인 링크, 남은 작업 |
| [docs/archive/haetsalharu-plan.md](docs/archive/haetsalharu-plan.md) | 이전 아이디어 햇살하루 백업 기획서 |

## 에셋 생성 프롬프트

추후 시각 퀄리티를 높이기 위한 에셋 생성 프롬프트는 아래에 정리합니다.

| 문서 | 역할 |
|---|---|
| [docs/asset-prompts/README.md](docs/asset-prompts/README.md) | 에셋 프롬프트 모음 안내 |
| [docs/asset-prompts/00-style-guide/prompt-style-guide.md](docs/asset-prompts/00-style-guide/prompt-style-guide.md) | 전체 프롬프트 스타일 가이드 |
| [docs/asset-prompts/00-style-guide/generation-checklist.md](docs/asset-prompts/00-style-guide/generation-checklist.md) | 생성 전 체크리스트 |
| [docs/asset-prompts/01-manager-sprite/electronic-manager-sprite-sheet.md](docs/asset-prompts/01-manager-sprite/electronic-manager-sprite-sheet.md) | 전자 생물 매니저 스프라이트 |
| [docs/asset-prompts/02-room-backgrounds/xp-shell-room-hybrid.md](docs/asset-prompts/02-room-backgrounds/xp-shell-room-hybrid.md) | XP shell + pixel room 하이브리드 배경 |
| [docs/asset-prompts/02-room-backgrounds/lofi-cabin-room.md](docs/asset-prompts/02-room-backgrounds/lofi-cabin-room.md) | 로파이 오두막 배경 백업안 |
| [docs/asset-prompts/03-ui-kit/webapp-ui-kit.md](docs/asset-prompts/03-ui-kit/webapp-ui-kit.md) | 웹앱 UI 키트 |
| [docs/asset-prompts/04-rewards/reward-object-sheet.md](docs/asset-prompts/04-rewards/reward-object-sheet.md) | 보상 오브젝트 시트 |
| [docs/asset-prompts/05-social-world/space-fragments.md](docs/asset-prompts/05-social-world/space-fragments.md) | 우주 조각 탐색 확장안 |
| [docs/asset-prompts/05-social-world/flower-field.md](docs/asset-prompts/05-social-world/flower-field.md) | 우주 꽃밭 탐색 확장안 |
| [docs/asset-prompts/06-pixel-tv/reality-pixel-tv.md](docs/asset-prompts/06-pixel-tv/reality-pixel-tv.md) | 현실 픽셀화 TV 확장안 |
| [docs/asset-prompts/07-audio-visual-fx/visual-fx-sheets.md](docs/asset-prompts/07-audio-visual-fx/visual-fx-sheets.md) | 시각 효과 시트 |

## Wiki

GitHub Wiki는 코드 PR에 직접 포함되지 않으므로, PR 본문에 링크로 연결합니다.

- Wiki: https://github.com/YIFNEN/hub/wiki

## MVP 핵심 흐름

```text
Profile Setup Wizard
-> XP Desktop
-> 오늘의 퀘스트 수정/수락
-> QuestRunner.exe 실행
-> 완료/실패 처리
-> EXP 성장 또는 복구 퀘스트 제안
-> 기록 노트 저장
```

## 이번 PR의 핵심

- XP 데스크톱형 React MVP 프로토타입 구현
- 창 닫기, 작업표시줄 열린 창 목록, 창 드래그 이동 구현
- QuestRunner.exe 형태의 퀘스트 진행 창 구현
- 기획서/Wiki용 정적 미리보기 `public/prototype-static.html` 추가
- 프로젝트 문서를 역할별 `docs/` 구조로 재정리
