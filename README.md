# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## 문서
- [TideNote 기획서](https://github.com/snael0510-coder/hub/wiki/TideNote-%EA%B8%B0%ED%9A%8D%EC%84%9C)

## 7/9 진행 상황
Claude Design, Google Stitch 등 AI 디자인 도구로 먼저 시도했으나 원하는 UI가 나오지 않아 Figma로 직접 디자인 작업을 진행했습니다. 오늘 안에 개발 Agent에 export할 수준까지는 완성하지 못해, 디자인 skill 문서화 및 개발 환경 구성은 내일(7/10) 이어서 진행합니다.

## 개발 Task (Week 2-4)

### Backlog란?
앞으로 해야 할 작업들을 모아둔 목록. Sprint 시작 시 이 중 일부를 뽑아 실제 작업 계획으로 옮긴다. 매 스프린트마다 팀이 모여 우선순위를 검토(grooming)하고 높은 것부터 가져온다.

### Week 2 — 핵심 기능 뼈대
| 우선순위 | Task | 설명 |
|---|---|---|
| 상 | Episode Segmentation | 메시지 간 시간 간격 기준으로 대화를 episode로 분리 |
| 상 | 기본 채팅 UI | 연속 스트림 + 인라인 블록 라벨 |
| 상 | Tide Check 화면 | Valence/Arousal 슬라이더, 하루 1회 필수 체크인 |
| 중 | Express 기본 서버 | 대화/episode 저장용 API 뼈대 |

### Week 3 — Recall 로직 + History
| 우선순위 | Task | 설명 |
|---|---|---|
| 상 | Recall Module | D_gen/D_recall 격차 계산, threshold 판단 |
| 상 | 24h History / Long History 탭 | 목록 UI + 탭 전환 |
| 상 | Attachment(첨부) 인터랙션 | History 카드를 채팅창에 참조 카드로 첨부 |
| 중 | Circadian Estimation | MEQ 온보딩 설문 + D_gen 계산 |

### Week 4 — 마무리 + 발표 준비
| 우선순위 | Task | 설명 |
|---|---|---|
| 상 | Daily Tide Window | 당일 아침 지나면 자동 노출 전환 |
| 상 | 발표 자료(PT) 제작 | 최종 데모 시나리오 + 슬라이드 |
| 중 | 스타일링 폴리싱 | 색감/트랜지션 다듬기 |
| 하 | 배포 (선택) | Vercel/Netlify 간단 배포 |

## 2주차 문서
- [백로그 (우선순위·일정)](./docs/backlog.md)
- [작업 체크리스트](./docs/checklist.md)
- [계획 수립 Agent](./docs/agents/planning-agent.md)
