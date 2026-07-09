---
name: aiport-design-system
description: Apple/iOS 스타일 디자인 시스템(색상·타이포·라운드·여백·카드·레이아웃 규칙)을 적용해 AI Portfolio Agent 프론트엔드 화면을 만들거나 다듬을 때 사용. "디자인", "페이지 만들어줘", "스타일 적용", "UI" 관련 요청 시 이 규칙을 기준으로 삼는다.
---

# AI Portfolio Agent 디자인 시스템

AirPods Max 인포그래픽(블루그레이 톤 카드)과 macOS/iOS 시스템 UI(비비드 블루 액센트, 반투명 패널)를 참고해 만든 디자인 규칙. 새 화면을 만들거나 기존 화면을 다듬을 때 아래 CSS 변수와 레이아웃 규칙을 그대로 따른다.

## CSS 변수 (디자인 토큰)

```css
:root {
  /* Color */
  --color-primary: #0A84FF;
  --color-primary-hover: #3396FF;
  --color-primary-muted: #5B7B9C;

  --color-bg-page: #EFEFF1;
  --color-bg-surface: #FFFFFF;
  --color-bg-elevated: rgba(255, 255, 255, 0.85);
  --color-bg-subtle: #F4F6F8;

  --color-text-primary: #1C2733;
  --color-text-secondary: #6B7785;
  --color-text-tertiary: #9AA5B1;
  --color-text-on-primary: #FFFFFF;

  --color-border: rgba(28, 39, 51, 0.08);
  --color-border-strong: rgba(28, 39, 51, 0.14);

  /* Typography */
  --font-family-base: -apple-system, "SF Pro Display", "SF Pro Text",
    "Pretendard", "Inter", system-ui, sans-serif;
  --font-family-pixel: "Press Start 2P", monospace; /* 포인트 강조 단어 전용, 본문엔 쓰지 않음 */

  --font-size-display: 44px;
  --font-size-title: 20px;
  --font-size-body: 15px;
  --font-size-caption: 12px;

  --font-weight-bold: 700;
  --font-weight-medium: 500;
  --font-weight-regular: 400;

  --line-height-tight: 1.12;
  --line-height-normal: 1.45;

  /* Radius */
  --radius-card: 28px;   /* 큰 패널 */
  --radius-panel: 16px;  /* 서브 카드, 팝오버 */
  --radius-control: 10px;/* 버튼, 인풋 */
  --radius-pill: 999px;  /* 태그, 토글 */

  /* Spacing (4px 배수 스케일) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  --card-padding: var(--space-5);
  --card-gap: var(--space-4);
  --page-margin: var(--space-6);

  /* Shadow */
  --shadow-card: 0 8px 24px rgba(28, 39, 51, 0.08);
  --shadow-panel: 0 4px 16px rgba(28, 39, 51, 0.12);
  --shadow-floating: 0 16px 40px rgba(28, 39, 51, 0.22);
}
```

## 카드 스타일 규칙

- 배경 `--color-bg-surface`(흰색), 라운드 `--radius-panel`(16px, 큰 패널은 `--radius-card` 28px), 테두리는 `--color-border` 1px(거의 안 보이는 수준), 그림자 `--shadow-card`
- 내부 여백은 `--card-padding`(24px) 고정, 카드 사이 간격은 `--card-gap`(16px)
- 반투명/플로팅 요소(알림, 팝오버, 다이얼로그)는 `--color-bg-elevated` + `backdrop-filter: blur(12~16px)` + `--shadow-floating`

## 색 사용 규칙

- 강조 버튼·링크·활성 상태 → `--color-primary` (iOS 블루)
- 제품/기술 이미지 톤, 서브 강조 → `--color-primary-muted` (블루그레이)
- 헤드라인 텍스트는 `--color-text-primary`, 설명문은 `--color-text-secondary`, 캡션/라벨은 `--color-text-tertiary`
- 페이지 바깥 배경은 `--color-bg-page`(연회색), 카드 안쪽은 흰색으로 명확히 분리

## 타이포 규칙

- 헤드라인은 굵고(`--font-weight-bold`) 타이트하게(`line-height: 1.12`), `letter-spacing: -0.02em`
- 본문은 회색 계열로 대비를 낮춰 헤드라인과 위계 차이를 분명히 함
- `--font-family-pixel`(비트/픽셀 폰트)은 헤드라인 중 한 단어짜리 포인트 강조에만 국한해서 사용 — 본문/설명문에는 절대 쓰지 않음. 강조할 단어는 폰트 크기를 본문 헤드라인의 40~45% 수준으로 줄여서 균형 맞추기
- 헤드라인의 핵심 키워드 하나는 `--color-primary` 배경 + 흰 글자의 하이라이트 박스(`border-radius: 6px`, 좌우 padding 10px)로 감싸 강조 가능

## 레이아웃 패턴 (Apple 웹페이지 특유의 배치)

- **상단 macOS 메뉴바 장식**: 반투명 바(`--color-bg-elevated` + blur) 안에 좌측 트래픽라이트 점(빨강/노랑/초록, 10px 원) + 메뉴 텍스트(File/Edit/View...) + 우측 문서 제목. 실제 기능은 없는 장식용 요소로, 화면 최상단에 배치해 "macOS 앱 같은" 느낌을 줌
- **콜라주형 플로팅 카드**: 히어로 영역을 `position: relative`로 잡고, 알림 카드·폴더 카드·컨트롤 패널·다이얼로그 카드를 `position: absolute`로 서로 살짝 겹치게 배치. 각 카드는 2~3도 정도 미세하게 `rotate()`시켜 손으로 흩뿌린 듯한 자연스러움을 줌
- **파일/폴더 이모지 활용**: 데이터 입력 단계(Repo/JD/Resume 등)를 표현할 때 📁 🗂️ 📄 같은 파일류 이모지를 아이콘 대용으로 사용 — 별도 아이콘 폰트 없이도 macOS Finder 느낌을 냄
- **버튼 배치**: 로그인 등 보조 액션은 `.btn-ghost`(테두리만 있는 투명 버튼), 핵심 CTA는 `.btn-primary`(iOS 블루 채움)로 나란히 배치. 항상 보조 액션이 왼쪽, 주 액션이 오른쪽
- **하단 스트립 내비게이션**: Photos 앱처럼 좌측에 탭 목록, 가운데 현재 상태/날짜 + 점(dot) 페이지네이션, 우측에 폴더形 아이콘 버튼을 한 줄짜리 카드에 담아 푸터/내비게이션으로 사용

## 사용 시 주의

- 이 토큰/패턴은 프로토타입 단계의 "느낌"을 정의한 것이라, 실제 React 컴포넌트에 적용할 때는 `:root`의 CSS 변수를 `src/index.css` 등 전역 스타일에 선언하고 각 컴포넌트는 변수만 참조하도록 한다 (하드코딩 금지)
- 픽셀 폰트/콜라주 플로팅 카드 같은 장식 요소는 과하게 남용하지 말고, 페이지당 1~2곳(주로 히어로 영역)에만 적용해 포인트로 남긴다
