## 프로젝트
PlaceSync — 소상공인 사장님이 네이버 플레이스·카카오맵·배달앱에 등록한 매장 정보(영업시간·메뉴·가격·공지)를
한 곳에서 수정하면 플랫폼별로 자동 반영해 주는 B2B SaaS 대시보드.

## 기술 스택
- `react/` — React 19 + Vite, JavaScript(JSX). TypeScript 아님.
- `prototype/` — 순수 HTML5 + CSS3. JS·프레임워크·외부 CDN 사용 안 함(README에 명시된 원칙).

## 컨벤션
- 커밋 메시지: `feat` / `fix` / `docs` / `refactor` (기존 `git log` 스타일 따름)
- 예시 데이터는 항상 "카페 하루" 세트 재사용: 메뉴 3종(아메리카노/카페라테/치즈케이크), 플랫폼 3개(네이버 플레이스/카카오맵/배달앱)

## UI 작업 시 반드시 지킬 것
- 색상·타이포·간격·radius·카드/버튼/배지/입력 스타일은 항상 `@docs/design.md` 토큰을 그대로 쓴다. 화면마다 임의의 헥스값이나 수치를 새로 만들지 않는다.
- 새 화면·컴포넌트를 만들거나 기존 화면의 스타일을 고칠 때는 `design-skill-default`(Skill)을 적용한다.

## 하지 말 것
- `docs/design.md`에 없는 색상·radius·spacing 값을 임의로 추가하지 않는다.
- 상태(완료/검토중/실패/대기)를 색상만으로 표현하지 않는다 — 아이콘/텍스트 병기 필수.
- `prototype/`에 JS나 외부 라이브러리를 추가하지 않는다.
- 화면 하나에 primary 버튼을 2개 이상 두지 않는다.
- `any` 성격의 임의 타입·구조 추정 금지 — 애매하면 먼저 물어본다.

## 참고
- 기획서: @docs/plan.md
- 보조 자료: @docs/feature-spec.md
- 개발 체크리스트: @docs/checklist.md
- 디자인 시스템: @docs/design.md
