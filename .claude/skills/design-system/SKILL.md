---
name: design-system
description: Apply the AlriJang (알리장) design system when writing or editing any UI code in this project — actual layout/detail from design-reference/*.html and colors/typography/spacing/radius/component tokens from DESIGN.md. Use before creating a new component/page or styling existing ones.
---

# 알리장 디자인 시스템 적용

이 스킬은 UI 코드(JSX, className, CSS)를 새로 쓰거나 수정하기 전에 호출한다.

## 절차

1. 새 화면/컴포넌트를 만들 때는 `WIREFRAME.md`(이 스킬 파일 기준 `../../../WIREFRAME.md`)로 어떤 화면인지, 대략적인 섹션 구성을 빠르게 파악한다.
2. 실제 구현은 반드시 `design-reference/`에서 해당 화면의 HTML 파일을 열어서 만든다. 아이콘, 카드 스타일, 강조 요소(예: 히어로 카드의 좌측 컬러 보더, 원형 진행률 그래프), 인터랙션 디테일까지 실제 마크업을 보고 React 컴포넌트로 옮긴다. WIREFRAME.md는 저해상도 스케치라 이런 디테일이 다 빠져 있으므로 최종 결과물의 기준으로 삼지 않는다.
3. `DESIGN.md`(이 스킬 파일 기준 `../../../DESIGN.md`)를 읽는다. frontmatter의 `colors`/`typography`/`rounded`/`spacing` 토큰과, 본문의 Colors/Typography/Elevation/Shapes/Components 섹션을 확인한다.
4. 색상은 hex 코드를 직접 쓰지 말고 토큰 이름 기반 Tailwind 유틸리티를 쓴다. 예: `bg-primary`, `text-on-surface`, `bg-surface-container-lowest`, `border-outline-variant`. (design-reference HTML의 색상 클래스는 DESIGN.md 토큰과 이미 동일하므로 그대로 옮겨도 된다.)
5. 타이포는 `font-{token}`과 `text-{token}`을 세트로 쓴다 (예: `font-headline-lg text-headline-lg`). display/headline/body/label × lg/md/sm 조합만 사용하고 임의 px 값을 쓰지 않는다.
6. 간격은 숫자 스케일 대신 이름 있는 토큰(`p-lg`, `gap-md`, `p-container-margin` 등)을 우선 사용한다.
7. 라운드는 카드 `rounded-xl`, 버튼/입력 `rounded-lg`, 배지/아바타 `rounded-full` 기본 규칙을 따른다.
8. 그림자가 필요하면 DESIGN.md의 `shadow-soft`/`shadow-dropdown` 정의를 그대로 쓴다 (Elevation & Depth 섹션 참고).
9. 아이콘은 design-reference에서 쓰는 Material Symbols Outlined를 그대로 쓴다 (`index.html`에 폰트 링크 이미 포함, `.material-symbols-outlined` 클래스는 `src/index.css`에 정의).
10. design-reference의 외부 이미지 URL(googleusercontent 등 임시 생성 링크)은 그대로 쓰지 않는다. 실제 이미지가 없는 자리는 `bg-surface-variant` 같은 플레이스홀더로 대체한다.

## design-reference/DESIGN.md에 없는 패턴을 만들 때

임의로 새 레이아웃이나 색/값을 만들지 말고, 가장 가까운 기존 화면/토큰으로 근사한 뒤 사용자에게 "문서에 없는 패턴인데 이렇게 추가해도 될지" 짧게 확인한다.

## 요청이 문서와 충돌할 때

사용자 요청이 design-reference의 레이아웃이나 DESIGN.md의 색/타이포/간격 규칙과 다르면 바로 적용하지 말고, 문서와 다르다는 점을 먼저 말하고 해당 문서도 같이 업데이트할지 확인한다.
