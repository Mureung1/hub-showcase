---
name: default-design-rule
description: >-
  Use whenever creating or modifying ANY UI in this hub project — screens, pages,
  components, HTML/CSS/JS under web/, layouts, cards, tabs, buttons, colors,
  typography, fonts, spacing, or visual styling. Enforces the canonical design
  system in docs/spec/design.md (warm cream/terracotta): reuse the :root CSS
  variables in web/style.css and never hardcode design values. Triggers on: UI,
  화면, 컴포넌트, 디자인, 스타일, 색상, 팔레트, 폰트, 레이아웃, CSS, 카드, 탭.
---

# default-design-rule — hub UI 디자인 준수 규칙

이 프로젝트(hub)의 **모든 UI/화면 작업**은 디자인 정본
[docs/spec/design.md](../../../docs/spec/design.md) 를 따른다.

## 반드시 지킬 것
1. **CSS 변수 재사용, 하드코딩 금지.** 색·폰트·간격·radius는 [`web/style.css`](../../../web/style.css)의 `:root` 변수(`--bg`, `--card`, `--ink`, `--muted`, `--faint`, `--accent`, `--tag-bg`, `--tag-ink`, …)를 쓴다. `#c26b3f` 같은 값을 직접 박지 않는다.
2. **단일 강조색.** 강조는 테라코타 `--accent(#c26b3f)` 하나만. 색은 "중요도/액션" 표시에만 쓰고 장식용으로 남발하지 않는다. 배경은 크림 `--bg(#f3efe8)`, 카드는 흰색 `--card`.
3. **타이포.** Pretendard + `system-ui` fallback.
4. **레이아웃.** 760px 고정폭 중앙, 헤더 센터, 알약형(radius 20) pill 탭, 피드는 2열 그리드(`1fr 1fr`, gap 14). 좁은 화면은 1열로.
5. **카드 구조.** 흰 배경·radius 10·padding 16·옅은 그림자(테두리 없음). 세로 순서 = [중요도 dot(7px) + "중요" 라벨(high일 때만) + 🔖(우측)] → 영문 제목 → 한줄요약 → 태그(살구 `--tag-bg`).
6. **중요도 규칙.** `importance==="high"` → dot `--accent` + "중요" 라벨. 그 외 → 회색 dot `--dot-low`만(라벨 없음, 정렬 유지).

## 작업 순서
- UI를 만들기/고치기 전에 이 규칙과 design.md의 해당 섹션을 먼저 확인한다.
- 새 색·폰트·간격 토큰이 필요하면 **먼저 design.md에 정의하고 style.css의 `:root`에 추가**한 뒤 사용한다(임의 값 금지).
- 상세·저장 등 다른 화면도 피드와 동일한 팔레트·타이포·카드 언어를 따른다.

## 디자인이 바뀌면
design.md 원본은 Claude Design 프로젝트(`3cb9fbe9-b3d3-40b6-88a0-03dc3cdd7bc1`)에 있다.
디자인이 변경되면 **DesignSync**(`get_file` for `design.md`)로 재import해 `docs/spec/design.md`를 갱신하고, 바뀐 토큰을 `web/style.css`에 반영한다.
