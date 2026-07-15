## 프로젝트
Letter&Co — 초대장 발송부터 시간·장소·역할 조율, 진행 공유, 결산까지 모임의 마찰을 줄여주는 조율 에이전트.

## 기술 스택
- React (Vite, JS) + react-router-dom — FE
- Express — BE
- Supabase (Postgres) — DB
- Howler.js — 사운드 (design skill 12장 참고)
- 폰트: 고정 지정하지 않음 — design skill의 무드(빈티지·코티지·모리걸)와 타이포 규칙(15-1, 15-2)에 맞춰 Claude Design이 매 화면에 적합한 폰트를 자율적으로 선택

## 디렉토리 구조
```
hub/
├── docs/                # 기획·화면·디자인 문서
│   └── design/          # 최신 디자인 시스템 (Letter&Co Design System.zip, SKILL.md, 병합 브리프, UI 스크린샷)
├── prototype/           # 1차 단일 파일 프로토타입 (참고용, 최신 화면 구조와 다름)
├── warmup/              # 예전 Co-Sync 워밍업 과제 산출물 (Letter&Co와 무관, 수정 금지)
├── client/              # React (Vite)
│   └── src/{screens, components, hooks, lib, styles}
└── server/              # Express
    └── src/{routes, controllers, models, middleware, lib}
```
화면의 최신 기준은 `docs/design/Letter&Co Design System.zip`의 `templates/` (Claude Design 최신 프로토타입, 17개 화면).
`prototype/index.html`은 초기 6화면(SCR0~5) 데모로 참고용으로만 유지.

## 화면 구조 (최신 프로토타입 기준)
SCR0~5는 여정 단계 코드로 유지하고, 각 단계 아래에 시맨틱 이름의 하위 화면을 둔다.

| 단계 | 하위 화면 (templates/ 이름 → 컴포넌트) | 라우트 |
|---|---|---|
| SCR0 Invite | Start, InviteCompose, InviteShare, InviteJoin, ParticipantsStatus | `/scr0`, `/scr0/compose`, `/scr0/share`, `/scr0/join`, `/scr0/status` |
| SCR1 Gather | CoordinateSchedule, ScheduleChange | `/scr1/schedule`, `/scr1/change` |
| SCR2 Assign | CoordinateRoles | `/scr2/roles` |
| SCR3 Confirm | CoordinateConfirm | `/scr3/confirm` |
| SCR4 Bloom | GroupHome, ProgressChecklist, ProgressWorkspace | `/scr4/home`, `/scr4/checklist`, `/scr4/workspace` |
| SCR5 Harvest | Settlement, HarvestReview, HarvestSummary | `/scr5/settlement`, `/scr5/review`, `/scr5/summary` |
| 공통 | Notifications, Profile | `/notifications`, `/profile` |

- 화면 파일 위치: `client/src/screens/scr{번호}/{컴포넌트명}.jsx` (예: `screens/scr0/InviteCompose.jsx`), 공통 화면은 `screens/common/`
- 여정 단계가 하나의 화면으로 충분하면 하위 경로 없이 `/scr{번호}` 하나만 써도 된다

## 컨벤션
- 컴포넌트: PascalCase, 파일명과 컴포넌트명 일치
- 라우팅: react-router-dom, 위 화면 구조 표의 경로를 따른다
- API 라우트: REST, 복수형 리소스명 (`/letters`, `/letters/:token`) — Supabase 스키마(`letters`, `participants`, `responses`)와 이름 일치
- API 응답 형식: `{ data, error }` 고정 래핑, 성공 시 `error: null`
- 그룹 링크 토큰: `nanoid(10)`, URL-safe 문자만 사용
- 배포: Vercel(client) + Render(server)
- 색상·폰트·간격: 반드시 design skill 토큰 사용, 하드코딩 금지
- 커밋: `type: 한글 설명` — feat / fix / refactor / docs / design / chore

## 하지 말 것
- 빨강·형광 경고색 사용 금지 — 오류도 잉크브라운 톤으로 표현
- 미완료·지연 강조 금지 — 완료 항목만 조용히 표시
- 사람 간 감정·관계를 판단하는 로직 금지 — 추천은 시간·장소·업무 등 검증 가능한 대상에 한정
- 자동 확정 UI 금지 — 모든 확정은 사용자 클릭으로 완료
- 합의 없는 외부 UI 라이브러리 도입 금지 (Tailwind, MUI, 상태관리 라이브러리 등)
- 화면당 장식 요소(레이스, 개화 애니메이션 등) 2개 이상 사용 금지
- `warmup/` 내부 파일 수정 금지 — 보존용 아카이브

## 참고 (저장소 내 경로)
- 기획서: `docs/plan.md`
- 화면 구조·흐름: `docs/screen_flow.html`
- 디자인 시스템 스킬: `docs/design/SKILL.md`
- 최신 디자인 산출물: `docs/design/Letter&Co Design System.zip` (`templates/` = 화면, `components/` = 컴포넌트, `tokens/` = 토큰)
- 디자인 리파인 브리프: `docs/design/letter-and-co-merge-brief.md`
- UI 스크린샷(3차 프로토타입): `docs/design/UI screenshot/`
- 초기 프로토타입: `prototype/index.html`, `prototype/styles.css`
