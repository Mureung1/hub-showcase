---
name: design-system
description: GAZUA 프런트엔드에서 스타일링 관련 작업을 할 때 반드시 사용한다. 새 컴포넌트를 만들거나 스타일을 입힐 때, 색상·간격·타이포그래피·그림자·radius·아이콘 크기·breakpoint·motion·z-index 값이 필요할 때, Emotion styled component나 css prop을 작성할 때, 상승/하락 같은 시세 색상이나 AI 상태 색상을 다룰 때, 전역 리셋(reset.ts)이나 전역 스타일(globalStyles.ts, GlobalStyle.tsx)을 수정할 때 사용한다. "버튼/카드/뱃지 만들어줘", "이 색 뭐 써야 해", "spacing 얼마나 줘야 해", "다크 배경에 텍스트 색" 같은 요청에도 트리거한다. hex 코드나 px 값을 코드에 직접 쓰기 전에 먼저 이 스킬을 확인한다.
---

# GAZUA 디자인 시스템

실제 내용은 이 저장소를 쓰는 모든 Agent(Claude Code, Codex 등)가 함께 읽는 일반 문서에 있다. 이
파일은 Claude Code에서 스타일링 작업 시 자동으로 그 문서를 상기시키는 역할만 한다.

- 토큰 카탈로그(색상/간격/타이포그래피/radius/shadow/컴포넌트 상태/반응형/접근성):
  `docs/design-system.md`
- UI 작업 절차 체크리스트: `docs/design-skill.md`
- 실제 토큰 값의 소스: `frontend/src/app/styles/theme.ts`
- 전역 리셋/베이스 스타일: `frontend/src/app/styles/reset.ts`, `frontend/src/app/styles/globalStyles.ts`

## 핵심 원칙 (빠른 참조용 요약, 전체는 docs/design-system.md)

1. `theme.palette.*`가 아니라 `theme.colors.*`(semantic 토큰)를 사용한다.
2. hex 색상, px 간격, box-shadow를 하드코딩하지 않고 토큰을 사용한다.
3. market 색상(`theme.colors.market.*`)과 status 색상(`theme.colors.status.*`)을 혼용하지 않는다.
4. 버튼/인풋/카드 등 반복되는 스타일은 `theme.components.*`를 먼저 확인한다.
5. 금액·수익률처럼 자릿수가 바뀌는 숫자에는 `.numeric` 클래스를 붙인다.

작업 전 `docs/design-system.md`와 `docs/design-skill.md`를 읽고, 작업 후 `pnpm lint`/`typecheck`/
`test`/`build`로 검증한다.
