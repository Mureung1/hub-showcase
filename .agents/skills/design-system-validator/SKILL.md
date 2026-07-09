---
name: design-system-validator
description: 수강신청 AI 네비게이터의 UI/UX 디자인 시스템 규격 및 CSS 일관성을 검증하는 나만의 디자인 스킬
---

# Design System Validator Skill

이 스킬은 "GNU 수강신청 AI 네비게이터" 애플리케이션의 화면 설계, HTML/CSS 생성, React 컴포넌트 마크업 시 디자인 시스템 일관성을 자율적으로 검증하기 위해 사용됩니다.

## 1. 디자인 시스템 핵심 규칙

에이전트는 UI 작업을 수행하기 전에 항상 다음 기준을 충족하는지 검토해야 합니다.

### A. 색상 일관성 (Color Constraints)
- 하드코딩된 색상 코드(예: `#111827`, `#3f51b5`)의 직접 사용을 금지합니다.
- 반드시 `design_system.md`에 정의된 CSS 변수를 사용하십시오:
  - 배경: `var(--bg-deep)`, `var(--bg-card)`
  - 브랜드 강조: `var(--color-primary)` (Indigo), `var(--color-secondary)` (Blue)
  - 상태: `var(--color-success)` (Green), `var(--color-warning)` (Amber), `var(--color-danger)` (Red)

### B. 타이포그래피 (Typography)
- 영문/숫자 타이틀이나 주요 데이터 포인트는 `font-family: 'Outfit'`을 사용하고 있는지 확인하십시오.
- 일반 설명 및 한글 텍스트는 `font-family: 'Noto Sans KR'`을 사용해야 합니다.
- 폰트 크기와 두께(Weight)가 정의된 Type Scale을 벗어나는 임의의 값(예: `font-size: 19px`, `font-weight: 550`)을 사용하지 마십시오.

### C. 레이아웃 & 패딩 (Spacing & Radius)
- 컴포넌트 여백은 8px 배수(`8px`, `16px`, `24px`, `32px`)를 유지하고 있는지 확인하십시오.
- 모든 카드형 UI 요소에는 `border-radius: 16px`가 부여되어야 합니다.
- 버튼 및 칩스(Chips)에는 `border-radius: 8px`를 적용합니다.

### D. 프리미엄 느낌 (Premium Feel)
- 주요 인터랙션(버튼 호버, 카드 마우스 오버 등)에 부드러운 전환 효과(`transition: all 0.3s cubic-bezier(...)`)가 반영되어 있는지 확인하십시오.
- 모달 배경이나 흐림 효과가 들어가는 요소에 `backdrop-filter: blur(12px)`가 정상 선언되었는지 확인하십시오.

---

## 2. 디자인 피드백 루프 및 자가 검증 체크리스트

코드를 수정하거나 생성한 후, 에이전트는 다음 질문에 자답하고 피드백을 반영해야 합니다:

1. [ ] **Figma 테마 변수 준수**: 새로 만든 컴포넌트에 하드코딩된 색상이 포함되어 있는가?
2. [ ] **서체 분리**: 영문/숫자 강조 부분에 `Outfit` 서체가 올바르게 입혀졌는가?
3. [ ] **마이크로 인터랙션**: 마우스 호버(Hover) 시의 visual feedback(`transform: translateY()`, `box-shadow`)이 존재하며 매끄러운가?
4. [ ] **반응형 대처**: 뷰포트 크기가 작아질 때 그리드가 무너지거나 텍스트가 겹치지 않는가?

*피드백 수렴 예시*: 사용자가 "디자인이 너무 칙칙하다" 혹은 "메시지 버블이 답답해 보인다"고 평가할 경우, 이 `SKILL.md` 내에 커스텀 변수를 갱신하거나 패딩(Padding) 가이드를 보정하여 반복 적용하십시오.
