---
name: ui-design
description: hub 프로젝트의 청록 포인트 컬러 디자인 시스템(필 선택자, 토글 스위치, 필터 카드, D-day 배지, 브라우저 목업 프레임)을 새 UI 작업에 적용. 새 화면/컴포넌트를 만들거나 기존 마크업·CSS의 시각적 일관성을 검토할 때 사용.
---

# hub UI 디자인 시스템

전체 토큰/클래스/근거는 [docs/design-system.md](../../../docs/design-system.md)에 있다 — 여기
없는 패턴을 새로 만들기 전에 먼저 읽는다. 이 파일은 적용 시 지킬 체크리스트다.

## Non-negotiable 규칙

1. 색은 `src/index.css`의 토큰만 쓴다 (`--accent`, `--accent-hover`, `--accent-text`,
   `--accent-soft-bg`, `--accent-soft-border`, `--danger`, `--text*`, `--bg*`, `--border`).
   새 hex/oklch 값을 하드코딩하지 않는다.
2. 2~4개 중 하나만 고르는 UI는 `<select>`/native radio가 아니라 필(pill) 패턴
   (`.pill` / `.pill-group` / `.pill--selected`)을 쓴다.
3. 불리언 상태는 checkbox가 아니라 토글 스위치 패턴 (`.toggle-row` / `.switch` /
   `.switch--on`)을 쓴다.
4. "선택하면 활성화되는 카드"(필터 버튼 등)는 2px 테두리 + 비활성 회색 / 활성 `--accent`
   테두리 + `--accent-soft-bg` 패턴을 따른다 (`.dashboard__feature-button` 참고).
5. D-day·긴급도 배지는 기본을 무채색 회색으로 두고, 실제로 임박했을 때만
   (`.task-card__dday--urgent`처럼) `--danger`를 쓴다. 모든 배지를 빨강으로 칠하지 않는다.
6. 새 컴포넌트는 `ComponentName.tsx` + 같은 위치 `ComponentName.css` 페어로 만들고, 클래스명은
   BEM(`.block__element--modifier`)을 따른다. Tailwind/CSS Modules를 도입하지 않는다.
7. 랜딩/마케팅 섹션에서 실제 앱 화면을 미리 보여줘야 하면 정적 스크린샷 대신
   `.landing__mockup-*` 브라우저 크롬 프레임 패턴을 재사용한다.
8. 필/토글은 숨긴 native input이 아니라 `<button type="button">` +
   `role="radio"`/`aria-checked`(필) 또는 `aria-pressed`(토글)로 만든다. 날짜 입력과 태스크
   체크박스만 native를 유지한다.

## 워크플로

1. 새 화면을 만들기 전에 `OnboardingForm.tsx`/`Dashboard.tsx`/`TaskCard.tsx`/`Landing.tsx`에
   이미 쓸 수 있는 패턴이 있는지 먼저 확인한다.
2. 기존 패턴으로 표현이 안 되는 진짜 새로운 컴포넌트가 필요하면, 색/여백/반경은 위 토큰
   스케일에서 파생시키고, 다음에도 재사용할 수 있도록 `docs/design-system.md`에 패턴을
   추가한다.
