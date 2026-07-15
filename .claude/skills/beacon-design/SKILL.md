---
name: beacon-design
description: >-
  Beacon 웹 UI를 만들거나 스타일링할 때 사용한다. 화면·컴포넌트를 새로
  만들거나 색/타이포/간격/버튼/카드/뱃지/차트를 다룰 때, docs/design.md 의
  디자인 토큰을 단일 원천으로 삼아 일관된 디자인을 유지하도록 강제한다.
  트리거 예: "화면 만들어", "페이지 추가", "컴포넌트 스타일", "디자인 맞춰줘",
  "색/버튼/카드/차트", "Beacon UI", "React 화면".
---

# Beacon 디자인 스킬

Beacon의 모든 UI는 **하나의 디자인 시스템**을 따른다. 이 스킬은 새 화면/컴포넌트를
만들 때 그 일관성을 자동으로 지키게 한다.

## 0. 시작 전 필수

작업 시작 전 **[`docs/design.md`](../../../docs/design.md)를 먼저 읽는다.** 그것이 색·타이포·
간격·컴포넌트의 단일 원천이다. 이 파일은 요약일 뿐이며, 값이 충돌하면 `docs/design.md`가 우선.

**방향: Stripe/Linear풍 클린 SaaS · 라이트 온리** (밝은 캔버스 + 인디고 accent + 소프트 섀도우 + 사각-라운드).

토큰 원본: `src/index.css` (`:root` 단일, 라이트 온리)

## 1. 절대 규칙 (하드코딩 금지)

- 색·그림자·라운드는 **항상 CSS 변수**로. 컴포넌트/JSX/CSS에 리터럴 색(`#…`, `rgb(...)`)을 쓰지 않는다.
  - 예외: 차트 라이브러리 등 JS 인자가 필요하면 `getComputedStyle(document.documentElement).getPropertyValue('--토큰')`으로 토큰을 읽어 전달한다. (`src/pages/StockPage.jsx` 참고)
  - 예외: Discord 미리보기처럼 **외부 브랜드를 재현**하는 화면은 그 브랜드 팔레트를 로컬 변수로 두되, Beacon accent만 `var(--accent)`로 흘려보낸다.
- 새 색이 필요하면 임의로 만들지 말고 `docs/design.md`에 토큰을 추가한 뒤 사용한다.

## 2. 토큰 빠른 참조

- 텍스트: `--text`(본문) `--text-h`(제목) `--muted`(보조)
- 표면: `--bg`(카드) `--page-bg`(배경) `--border` `--code-bg`
- 브랜드: `--accent`(인디고 `#635bff`) `--accent-2` `--accent-bg` `--accent-border` `--on-accent` (에이전트 판단·CTA·강조)
- 시맨틱: `--green`/`--green-bg`, `--red`/`--red-bg`
- **시장 관례색(국내)**: 상승·매수 = `--up`(빨강), 하락·매도 = `--down`(파랑), 관망 = `--hold`(앰버)
- 라운드: `--r-card`(12) `--r-cell`(10) `--r-pill`(8, 컨트롤 라운드)
- 그림자: `--shadow` · 모션: `--transition`(0.15s ease)

## 3. 재사용 컴포넌트 클래스

새로 만들기 전에 이미 있는 공용 클래스를 쓴다 (정의: `src/index.css`):
`.card` · `.badge.buy/.sell/.hold` · `.pill` · `.status.active/.pending/.done` ·
`.btn`/`.btn.accent`/`.btn.block` · `.verdict`(`.tag`+`.headline`) · `.cell` · `.brand` · `.caption`

- 화면 고유 레이아웃만 화면별 `*.css`에 둔다 (색은 여전히 토큰 참조).
- 차트가 필요하면 `src/pages/StockPage.jsx`의 lightweight-charts v5 캔들·마커 패턴과 디자인 토큰을 재사용한다.

## 4. 카피 · 관례

- 모든 UI 문구는 **한국어**.
- 숫자(가격·티커·날짜)는 `--mono` (`.mono`).
- AI 에이전트의 판단·개입은 **인디고(accent)**로 시각적으로 구분한다.

## 5. 셀프 검증 체크리스트

UI를 만든 뒤 스스로 점검한다:

- [ ] 리터럴 색을 하드코딩하지 않았다 (토큰만). `grep -nE "#[0-9a-fA-F]{3,6}|rgb\(" 새파일` 로 확인.
- [ ] 밝은 캔버스에서 텍스트 대비가 충분하다 (라이트 온리).
- [ ] focus-visible 링(accent)이 동작한다 (전역 `:focus-visible`).
- [ ] 상승/매수=빨강, 하락/매도=파랑 관례를 지켰다.
- [ ] 카드/라운드/간격이 기존 화면과 일관된다 (`--r-card`/`--r-cell`).
- [ ] 공용 컴포넌트 클래스를 재사용했다 (중복 스타일 없음).
- [ ] 반응형(≤860px)에서 레이아웃이 무너지지 않는다.
- [ ] 카피가 한국어이고 숫자는 mono다.
- [ ] preview 도구로 실제 렌더링을 확인했다.

## 6. Wave 2 — 레퍼런스/외부 스킬 병합 지점

외부 디자인 레퍼런스(사이트) 또는 오픈소스 디자인 스킬을 받으면:

1. 그 규칙을 이 스킬 본문에 병합한다 (충돌 시 사용자 확인).
2. 추출한 색·타이포·간격을 `docs/design.md` §2~§4 **토큰 값**과 `index.css` `:root` 변수 값에 반영한다. 변수 **이름은 유지**한다.
3. 컴포넌트/레이아웃은 건드리지 않는다 — 토큰 교체만으로 전 페이지가 리스타일된다.
