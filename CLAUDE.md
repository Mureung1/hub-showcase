## 프로젝트
대학생이 귀가 방향 겹치는 동행자를 찾아 택시를 나눠 타도록 매칭해주는 서비스 (AI Agent Challenge)

## 기술 스택
- FE: React + Vite (`project_idea/`)
- BE: Express (Node.js), 폴더는 `server/` (모노레포 — 별도 저장소로 분리하지 않음)
- DB: Supabase (Postgres) — 관계형 데이터 구조(사용자↔요청↔그룹↔채팅)에 적합하고, 팀원이 대시보드로 데이터를 공유·확인하기 쉬움

## 필요 라이브러리 (BE)
- `express` — 서버 프레임워크
- `cors` — FE(5173)와 BE가 다른 포트라서 브라우저 CORS 제한을 풀기 위함
- `dotenv` — 포트, Supabase 연결 키 등을 `.env`로 관리 (커밋 금지, `.gitignore`에 포함)
- `nodemon` — 개발용 자동 재시작
- `@supabase/supabase-js` — Express에서 Supabase(Postgres) 연결용

## 참고
- 기획서: @docs/plan.md
- 작업 체크리스트(백로그, 우선순위 P0/P1/P2): @docs/checklist.md
- 이번 주 계획(요일별 작업 순서): @docs/weekly-plan.md — 코드 작업을 요청받으면 이 순서·우선순위를 기본으로 따를 것
- 디자인 시스템(확정안): @design_handoff_ridesplit/README.md — 레드/코랄(`#C8102E`) 기반, Pretendard 폰트. 실제 개발 시 색상·타이포그래피·간격 값은 이 문서 기준으로 맞출 것
- 웹(데스크탑) 레이아웃 규칙: 콘텐츠는 max-width 430px 카드(데스크탑에서만 그림자·둥근 모서리)로 감싸고, 카드 바깥 여백은 brand color 톤 blob 패턴 배경으로 채움 — `design_handoff_ridesplit/README.md`의 "웹 레이아웃" 섹션 참고. `index.css` 전역 스타일에서만 처리, 화면별로 반복 구현 금지
- 프로토타입: `docs/prototype/` (순수 HTML/CSS, 위 디자인 시스템 적용됨, 배포: https://gyu-young-04.github.io/hub/prototype/)

## 컨벤션
- 커밋: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `test:`, `chore:`)
- 컴포넌트 파일명: PascalCase (예: `WeatherCard.jsx`)
- 일반 JS 파일명: camelCase (예: `mockWeather.js`)
- API 경로: REST 스타일, 복수형 명사 (예: `/api/candidates`, `/api/applications`)

## 하지 말 것
- `.env` 파일(Supabase 키 등) 커밋 금지
- 미정인 것들은 기능 구현하면서 발견되는 대로 이 섹션에 추가

## Git / PR
- 브랜치: `work` → upstream `connect-AIAgentChallenge-26-1/hub`의 `N148_장규영` 브랜치로 PR
- PR 본문 형식: `.github/pull_request_template.md` 참고

## Wiki 주의사항
- Wiki는 본체와 별개 저장소라 상대경로 링크 안 통함 + 저장소 Private라 `raw.githubusercontent.com`도 안 통함
- 이미지·프로토타입 링크는 GitHub Pages 절대 URL 사용 (예: `https://gyu-young-04.github.io/hub/wireframe.svg`)
