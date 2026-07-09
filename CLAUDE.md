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
├── prototype/           # Claude Code로 제작한 단일 파일 프로토타입
│   ├── index.html       # SCR0~5 전체를 담은 데모 (참고용, 실제 화면 분리와 무관)
│   └── styles.css
├── client/              # React (Vite)
│   └── src/{screens, components, hooks, lib, styles}
└── server/              # Express
    └── src/{routes, controllers, models, middleware}
```
프로토타입은 참고용 단일 파일이며, 실제 개발은 `client/src/screens/`에 SCR0~5를 화면별로 분리한 컴포넌트로 구현.

## 컨벤션
- 컴포넌트: PascalCase, 파일명과 컴포넌트명 일치
- 화면 파일: `SCR{번호}_{영문명}.jsx` (예: `SCR0_Invite.jsx`), SCR0(Invite)~SCR5(Harvest) 유지
- 라우팅: react-router-dom, 경로는 `/scr0` ~ `/scr5`로 화면 코드와 일치
- API 라우트: REST, 복수형 리소스명 (`/groups`, `/groups/:id/roles`)
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

## 참고
- 기획서: @"C:\Users\win\OneDrive\바탕 화면\Letter&Co\최종 기획안.md"
- 화면 구조·흐름: @"C:\Users\win\OneDrive\바탕 화면\Letter&Co\화면 플로우 구조 설계.html"
- 프로토타입: @"C:\Users\win\OneDrive\바탕 화면\Letter&Co\prototype\index.html"
- 프로토타입 스타일: @"C:\Users\win\OneDrive\바탕 화면\Letter&Co\prototype\styles.css"
- 디자인 시스템: @"C:\Users\win\OneDrive\바탕 화면\Letter&Co\letter-and-co-design-SKILL.md"


