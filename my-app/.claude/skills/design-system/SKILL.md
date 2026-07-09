---
name: design-system
description: Apply the AlriJang (알리장) design system when writing or editing any UI code in this project — layout/structure from WIREFRAME.md and colors/typography/spacing/radius/component tokens from DESIGN.md. Use before creating a new component/page or styling existing ones.
---

# 알리장 디자인 시스템 적용

이 스킬은 UI 코드(JSX, className, CSS)를 새로 쓰거나 수정하기 전에 호출한다.

## 절차

1. 새 화면/컴포넌트를 만들 때는 먼저 `WIREFRAME.md`(프로젝트 루트, 이 스킬 파일 기준 `../../../WIREFRAME.md`)에서 해당 화면의 레이아웃(섹션 배치, 들어가는 요소, 문구, 단계별 흐름)을 확인한다. 여기 없는 세부사항(정확한 아이콘, 엣지 케이스 등)이 필요하면 `design-reference/*.html`에서 해당 화면을 찾아 보충하되, 마크업이 아니라 구조만 참고한다.
2. `DESIGN.md`(이 스킬 파일 기준 `../../../DESIGN.md`)를 읽는다. frontmatter의 `colors`/`typography`/`rounded`/`spacing` 토큰과, 본문의 Colors/Typography/Elevation/Shapes/Components 섹션을 확인한다.
3. 색상은 hex 코드를 직접 쓰지 말고 토큰 이름 기반 Tailwind 유틸리티를 쓴다. 예: `bg-primary`, `text-on-surface`, `bg-surface-container-lowest`, `border-outline-variant`.
4. 타이포는 `font-{token}`과 `text-{token}`을 세트로 쓴다 (예: `font-headline-lg text-headline-lg`). display/headline/body/label × lg/md/sm 조합만 사용하고 임의 px 값을 쓰지 않는다.
5. 간격은 숫자 스케일 대신 이름 있는 토큰(`p-lg`, `gap-md`, `p-container-margin` 등)을 우선 사용한다.
6. 라운드는 카드 `rounded-xl`, 버튼/입력 `rounded-lg`, 배지/아바타 `rounded-full` 기본 규칙을 따른다.
7. 그림자가 필요하면 DESIGN.md의 `shadow-soft`/`shadow-dropdown` 정의를 그대로 쓴다 (Elevation & Depth 섹션 참고).
8. 버튼/카드/배지/입력/네비 등은 DESIGN.md의 Components 섹션에 있는 패턴을 그대로 따른다.

## WIREFRAME.md/DESIGN.md에 없는 패턴을 만들 때

임의로 새 레이아웃이나 색/값을 만들지 말고, 가장 가까운 기존 화면/토큰으로 근사한 뒤 사용자에게 "문서에 없는 패턴인데 이렇게 추가해도 될지" 짧게 확인한다. 확정되면 해당 문서에 그 패턴을 추가해서 최신 상태로 유지한다.

## 요청이 문서와 충돌할 때

사용자 요청이 WIREFRAME.md의 레이아웃이나 DESIGN.md의 색/타이포/간격 규칙과 다르면 바로 적용하지 말고, 문서와 다르다는 점을 먼저 말하고 해당 문서도 같이 업데이트할지 확인한다.
