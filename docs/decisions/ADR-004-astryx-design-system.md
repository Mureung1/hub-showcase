# ADR-004: Astryx 디자인 시스템 도입

- 상태: Accepted
- 날짜: 2026-07-16

## 배경

기존 스타일링 결정은 "일반 CSS + 자체 디자인 토큰(DESIGN.md)"이었다. 4주 MVP 안에서 버튼·팝업·뱃지·리스트 등 기본 UI를 전부 직접 만들면 접근성과 다크모드 품질을 확보하기 어렵고 제작 시간도 크다. Meta의 오픈소스 디자인 시스템 Astryx(`facebook/astryx`)는 150개 이상의 접근성 갖춘 React 컴포넌트, 테마·다크모드, CLI를 제공하며 "agent ready"를 표방해 AI Agent 기반 개발 방식과도 맞다.

## 결정

- `@astryxdesign/core`와 `@astryxdesign/theme-neutral`을 `apps/web`에 도입하고, `@astryxdesign/cli`는 devDependency로 둔다.
- Astryx는 내부적으로 StyleX를 사용하지만 소비자에게 노출되지 않고 빌드 플러그인·PostCSS·Babel 설정이 필요 없으므로, Vite 8 빌드 구성을 변경하지 않는다.
- 커스터마이징은 Astryx 테마의 CSS custom property 오버라이드로만 하고, 컴포넌트 fork나 내부 구조 복사를 금지한다.
- 기존 브랜드 토큰 값(#2563EB, 상태 색 3종 등)은 `docs/DESIGN.md`의 오버라이드 표로 승계한다.
- Astryx에 없는 도메인 전용 UI(Agenda 카드, FinalAnswer 카드, Decision Note 카드)만 직접 제작한다.
- Tailwind, styled-components 금지 규칙은 유지한다. 보조 스타일은 일반 CSS로 작성한다.

## 결과

- `docs/DESIGN.md`를 Astryx 기반으로 개정하고, `docs/design-skill.md`와 QA Reviewer 점검 항목에 Astryx 사용 규칙을 추가한다.
- 위험: React 19와의 호환 버전을 설치 시점에 Astryx 공식 문서로 확인해야 하며, 팀의 컴포넌트 학습 비용이 있다.
- 페이지별 UI 기획은 이 결정과 무관하게 `docs/specs/`의 각 Spec에서 정의한다.
