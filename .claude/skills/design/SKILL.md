---
name: design
description: Use this skill whenever building, editing, or reviewing any SUBZIP UI — pages, components, colors, cards, buttons, badges, chips, list items, tabs, or subscription-service icons/dots. Read it before writing HTML/CSS for a SUBZIP screen or picking a color for a new component. Points to docs/design.md as the single source of truth for design tokens (color/typography/radius/shadow), component patterns, and the deterministic service-color hashing rule. Triggers on — "카드", "버튼", "배지", "칩", "색상", "컴포넌트", "디자인", "UI", "화면", "톤", "서비스 색상", "구독 아이콘", "card", "button", "badge", "chip", "color token", "design system".
---

# SUBZIP 디자인 스킬

이 스킬은 규칙을 직접 담고 있지 않다. SUBZIP UI 작업 전에 반드시 [`docs/design.md`](../../../docs/design.md)를 읽고, 그 안에 정의된 토큰과 규칙을 그대로 따른다.

## 작업 전 체크리스트

1. **컬러 (design.md §3)** — hex 값을 임의로 새로 만들지 말고 표에 정의된 토큰(`color-primary`, `color-bg`, `color-card*`, `color-text*`, `color-border*` 등)을 그대로 쓴다.
2. **서비스 구분 색상 (design.md §3)** — 구독 서비스별 도트/아이콘 색은 반드시 고정 8색 팔레트 + 해시 기반 배정 규칙(서비스명을 해시해 8로 나눈 나머지로 인덱스 결정)을 따른다. 화면마다 즉흥적으로 색을 고르지 않는다. 단, 넷플릭스처럼 인지도가 높은 서비스는 예외적으로 고정 색을 지정할 수 있다는 단서도 §3에 있으니 확인한다.
3. **타이포그래피 (§4)** — Display/H1/H2/Body-lg/Body/Caption 스케일을 그대로 사용한다.
4. **레이아웃 (§5)** — 카드/섹션 간격, flex+gap 규칙을 따른다.
5. **컴포넌트 패턴 (§6)** — 카드 3 variant(기본/제안/경고), pill 배지, 버튼 종류(primary/outline/link/브랜드 버튼), 리스트 아이템의 3분할 구조(도트·아바타 + 텍스트 + 부가정보)를 새로 설계하지 말고 재사용한다.
6. **엘리베이션·라운드 (§7)** — radius/shadow 토큰을 그대로 쓴다.
7. **접근성 (§8)** — 상태는 색상만이 아니라 항상 텍스트 라벨과 함께 표기하고, 저채도 텍스트는 배경 대비를 확인한다.

## design.md에 없는 새로운 패턴이 필요할 때

1. 기존 토큰의 조합만으로 해결할 수 있는지 먼저 검토한다.
2. 정말 새로운 토큰이나 컴포넌트가 필요하면, 구현과 동시에 `docs/design.md`에도 반영해 문서와 실제 구현이 어긋나지 않게 한다.

## 참고

- 토큰 시각화 프리뷰: [design.md 프리뷰 아티팩트](https://claude.ai/code/artifact/a06cc914-5844-4bcd-beaa-038a8629f03f)
- 기존 프로토타입 구현: [`docs/prototype/style.css`](../../../docs/prototype/style.css)
