---
name: nevermind-style-ui
description: Build and style web interfaces, components, and pages using the NEVERMIND Brutalist Dark & Monochromatic Design System.
---

# NEVERMIND Style UI Engineering Skill

## Overview (개요)
이 스킬은 프리미엄 럭셔리 스트리트웨어 브랜드 감성의 **Brutalist Dark & Monochromatic 디자인 시스템(NEVERMIND Style)**에 맞추어 UI 구성요소 및 전체 웹 페이지를 구현하고 스타일링하는 프로세스를 정의합니다. 이 스타일은 고대비 피치 블랙과 순백색의 사용, 볼드하고 넓은 타이포그래피, 가독성 높은 여백 관리를 주요 골자로 합니다.

## When to Use (사용 시점)
다음과 같은 경우에 이 스킬을 활성화하여 사용합니다.
- `NEVERMIND` 스타일 브랜딩을 적용해야 하는 웹페이지나 컴포넌트를 설계 또는 구현할 때
- 다크 모드 기반의 프리미엄 힙(Hip) 감성 스트리트웨어 쇼핑몰, 카탈로그, 포트폴리오 사이트를 제작할 때
- 고대비 단색화(Monochromatic) 레이아웃이나 브루탈리스트(Brutalist) 웹 디자인 요소 구현이 지시되었을 때
- [design.md](file:///Users/tatata/Desktop/Ai_agent/hub/design.md) 명세에 기반한 UI/UX 피드백이나 구현 요청이 있을 때

## Process (수행 절차)

### 1단계: 글로벌 스타일 및 테마 정의
- `index.css` 또는 공통 `<style>` 영역에 다음과 같은 핵심 CSS 변수들을 설정합니다.
  - 배경: `#000000` (Pitch Black)
  - 전경/텍스트: `#FFFFFF` (Pure White)
  - 보조/Muted: `#999999` 또는 `#CCCCCC` (Secondary Gray)
  - 테두리: `rgba(255, 255, 255, 0.15)`
  - 포인트 악센트(옵션): `#ff3c00` (Neon Orange-Red)
- 외부 폰트 라이브러리 연동:
  - 헤더/브랜드 로고 타이틀용: **Syne** 또는 **Montserrat** (Extended / Extra Bold)
  - 본문/UI 텍스트용: **Inter** 또는 **system-ui**
  - 테크니컬/숫자/티커용: **Space Grotesk** 또는 **SF Mono**

### 2단계: 핵심 그리드 및 배치 레이아웃 구성
- **Top Announcement Bar**: 최상단에 얇은 자간이 넓은 대문자 공지 바 구성.
- **GNB(헤더)**: 양쪽 끝 정렬 (`space-between`). `좌측: 소문자 메뉴 바 | 중앙: 브랜드 로고 | 우측: 아웃라인 아이콘들`.
- **Split Hero**: 5:5 비율로 분할된 2열 그리드 배치. 좌측에는 거대한 볼드 텍스트 오버레이(`line-height: 1.05`), 우측에는 시선을 사로잡는 고대비 제품 비주얼 혹은 다크 글래스모피즘 모듈(시계/카드 등) 구성.
- **Scrolling Ticker**: `white-space: nowrap`과 `@keyframes scroll`을 사용해 브랜드 메시지가 좌/우로 무한 롤링되는 슬라이더 추가.
- **Alternating Sections**: 본문 설명 구역은 좌측 텍스트-우측 이미지 / 좌측 이미지-우측 텍스트와 같이 교차 구성하여 리듬감 제공.

### 3단계: 컴포넌트 브루탈리스트 스타일링
- **버튼(Buttons)**: 둥근 테두리(border-radius)를 배제하고 **완전한 직각**으로 구성합니다.
  - Primary: 배경 `#FFFFFF`, 글씨 `#000000`
  - Secondary: 배경 투명, 테두리 `#FFFFFF` 1px, 글씨 `#FFFFFF`
  - 호버 액션 시 배경색과 글자색이 반전(Invert)되거나 네온 오렌지 아웃라인이 활성화되는 트랜지션을 적용합니다.
- **카드(Cards)**: 투명도 있는 배경(`rgba(255, 255, 255, 0.03)`)과 미세한 경계선으로 깊이감을 주고, 내부에 반투명 타원형 배지(`rgba(255, 255, 255, 0.08)`)를 띄웁니다.

### 4단계: 디테일 및 인터랙션 강화
- 마우스 무브먼트에 따라 미세하게 움직이는 배경의 어두운 오렌지/레드 그라데이션 글로우 효과(radial-gradient)를 추가하여 프리미엄 체감을 높입니다.
- 이미지 호버 시 미세하게 확대되는 효과(`transform: scale(1.05)`)를 주어 상호작용 피드백을 강화합니다.

## Common Rationalizations (흔한 합리화)
에이전트가 다음과 같이 타협하여 시스템을 훼손하는 것을 경계해야 합니다.
- *"모서리를 약간 둥글게(border-radius: 8px) 처리하면 더 깔끔해 보일 거야"* ➡️ **오류**. NEVERMIND 스타일은 완벽한 직각(Square edge)과 묵직함이 아이덴티티입니다.
- *"기본 회색이나 파란색 스크롤바를 그냥 두어도 상관없겠지"* ➡️ **오류**. 스크롤바를 포함한 모든 세부 디테일까지 완전한 다크/모노크롬으로 커스텀해야 합니다.
- *"텍스트가 대문자가 아니어도 크게 지장 없을 거야"* ➡️ **오류**. 메뉴와 메인 배너의 텍스트는 `text-transform: uppercase`를 통한 대문자 스타일링이 핵심 브루탈리스트 느낌을 제공합니다.

## Red Flags (금지 사항)
- 원색 계열(빨강, 노랑, 파랑 등)의 원색적인 배경이나 그라디언트를 난잡하게 사용하는 것.
- 둥근 모서리(`border-radius`)의 과도한 사용 (배지 등 타원형 요소를 제외한 카드, 버튼은 직각 준수).
- 부드러운 파스텔톤 컬러의 혼용.
- 폰트 계층 구조가 불명확하여 헤더와 본문 텍스트의 대비가 느껴지지 않는 디자인.

## Verification (검증 방법)
구현 완료 후 다음 항목을 테스트합니다.
- [ ] 전체 사이트의 배경이 피치 블랙(`#000000`)으로 일관성 있게 렌더링되는가?
- [ ] 카드와 버튼의 모서리가 완벽한 직각 상태를 유지하는가?
- [ ] 마우스 무브먼트 글로우 효과가 자연스럽게 동작하는가?
- [ ] 타이틀과 로고 폰트가 `Syne` 계열의 굵고 확장된 Sans-serif로 올바르게 로드되는가?
- [ ] 모바일 환경에서 4열 그리드가 1열 또는 2열로 자연스럽게 브레이크다운되는가?
