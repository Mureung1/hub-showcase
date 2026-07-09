---
name: august-style-ui
description: Apply the August* editorial design system (Brutalist dark, lime green/chartreuse accent, lowercase typography, overlapping collage layout, and winding SVG guide curves) to web interfaces.
---

# August* Style Editorial UI Engineering Skill

## Overview (개요)
이 스킬은 하이엔드 크리에이티브 에이전시 감성의 **August* 스타일 브루탈리스트 에디토리얼 디자인 시스템**에 맞추어 웹 페이지, 컴포넌트, 인터페이스를 구현하고 스타일링하는 프로세스를 정의합니다. 이 스타일은 피치 블랙(#000000) 배경에 순백색(#FFFFFF) 대형 타이포그래피, 형광 톤의 라임 그린(#d4ff00) 악센트 컬러, 겹쳐진 레이아웃(Collage Layout), 그리고 구불구불한 SVG 가이드 곡선(Winding Curve Line)을 특징으로 합니다.

## When to Use (사용 시점)
다음과 같은 경우에 이 스킬을 활성화하여 사용합니다.
- `August*` 스타일의 다크 에디토리얼 브랜딩을 적용해야 하는 웹페이지나 컴포넌트를 설계/구현할 때
- 다크 브루탈리즘 테마의 에이전시 소개, 한정판 출시(Drop), 고대비 포트폴리오 사이트를 제작할 때
- [index.html](file:///Users/tatata/Desktop/Ai_agent/hub/index.html) 및 [style.css](file:///Users/tatata/Desktop/Ai_agent/hub/style.css) 명세에 기반한 UI/UX 피드백이나 리팩토링 요청이 있을 때

## Process (수행 절차)

### 1단계: 에디토리얼 테마 정의 (Color & Type)
- `style.css` 또는 공통 `<style>` 영역에 다음과 같은 핵심 CSS 변수들을 설정합니다.
  - 배경: `#000000` (Pitch Black)
  - 전경/텍스트: `#FFFFFF` (Pure White)
  - 악센트/포인트: `#d4ff00` (Lime Green / Chartreuse)
  - 보조/Muted: `#888888` (Muted Gray)
  - 테두리: `rgba(255, 255, 255, 0.12)`
- 폰트 매핑 및 타이포그래피 규칙:
  - 브랜드 로고 및 대형 헤드라인용: **Syne** (Extra Bold)
  - 본문 및 세부 데이터용: **Inter** 또는 **system-ui**
  - **대문자 배제 (Lowercase Rule)**: 모든 헤더, 메뉴 텍스트, 타이틀은 대문자 사용을 배제하고 `lowercase`로 일관되게 표현합니다.

### 2단계: 콜라주식 레이아웃 및 이미지 오프셋 구성
- **GNB(헤더)**: 양쪽 끝 정렬(`space-between`). `좌측: 소문자 로고* | 중앙: 소문자 메뉴 | 우측: 완전 둥근 알약형(Pill) 아웃라인 버튼`.
- **Hero Section**: 
  - 중앙에 거대한 굵은 텍스트(예: `predict next`) 배치 (`font-size: 11vw`, `letter-spacing: -0.05em`).
  - 타이틀 주위로 여러 크기의 이미지(예: 흑백 인물 컷, 컬러풀 컷)를 `absolute` 위치로 오프셋 정렬하여 타이틀 텍스트를 위아래로 겹쳐 렌더링(Layered stacking)합니다.
- **Location Detail / Scroll**: 하단에 자간이 넓은 작은 텍스트와 세로 1px 높이의 얇은 선(Line)을 배치하여 균형을 잡습니다.

### 3단계: 구불구불한 SVG 프로세스 타임라인 구성
- 화면 스크롤 방향을 따라 snaking(구불구불)하게 뻗어나가는 얇은 라임 그린 라인(SVG Path)을 배경에 배치합니다.
- 곡선의 좌표에 연동하여 좌측/우측으로 번갈아 가며(Staggered) 단계별 프로세스 텍스트(예: `01. forecast`, `02. drop`, `03. market tracking`, `04. reward`)를 absolute 또는 grid 형태로 배치합니다.

### 4단계: 동적 콘텐츠 뷰 토글 (Hide Editorial Logic)
- **콘텐츠 중심 뷰 전환**: 사용자가 GNB에서 특정 세부 카테고리 탭(예: Sneakers, Streetwear 등)을 활성화하면, 첫 진입용 브랜드 에디토리얼 스토리(`.hero-section`, `.statement-section`, `.process-section`)가 자동으로 가려지고(`display: none` 등), 필터링된 상품 그리드가 화면 최상단(GNB 바로 밑)에 즉시 렌더링되도록 클래스를 동적 토글(예: `body.hide-editorial`)합니다.
- 사용자가 다시 `all` 탭을 선택하면 브랜딩 영역이 자연스럽게 다시 활성화되도록 제어합니다.

### 5단계: 인터랙션 디테일 설계
- 카드 컴포넌트 마우스 호버 시 이미지의 그레이스케일 필터가 해제되며 미세하게 줌(`transform: scale(1.05)`)되도록 합니다.
- 예측 마켓 카드 내의 미니 스파크라인(SVG Line)이 카드 호버 시 드로잉 애니메이션(`stroke-dashoffset`)을 타도록 설정합니다.
- 투표 동작에 성공하면 하단에서 상단으로 페이드 업되는 라임 그린 배경의 가벼운 알림 토스트(Toast)를 노출합니다.

## Common Rationalizations (흔한 합리화)
에이전트가 다음과 같이 타협하여 시스템의 에디토리얼 무드를 손상하는 것을 방지해야 합니다.
- *"영어 타이틀 첫 글자나 로고는 대문자로 쓰는 게 포멀해 보일 거야"* ➡️ **오류**. August* 에디토리얼 스타일의 핵심은 철저한 소문자(`lowercase`) 지향에 있습니다.
- *"탭 필터링 시에도 헤더 스토리 스크롤을 유지하는 게 풍부해 보일 거야"* ➡️ **오류**. 필터 클릭 시에는 목적에 부합하게 에디토리얼 영역을 완전히 가려 화면 상단에 기능(그리드)이 직관적으로 나와야 피로도가 줄어듭니다.
- *"곡선을 굳이 SVG로 그릴 필요 없이 그냥 CSS Border-radius로 둥글게 선을 잡자"* ➡️ **오류**. 구불구불한 리듬감은 오직 좌표가 제어된 SVG `<path>`를 통해서만 프리미엄 느낌을 줄 수 있습니다.

## Red Flags (금지 사항)
- 여러 색의 그라디언트 테두리 또는 파스텔 톤 컬러 혼용.
- 둥근 모서리(`border-radius: 12px` 등)를 버튼이나 이미지 컨테이너 카드에 기본값으로 난사하는 행위 (알약 모양의 GNB Action Button과 Muted Badge를 제외한 모든 카드, 버튼, 이미지 프레임은 샤프한 직각을 기본으로 준수).
- `text-transform: uppercase` 또는 첫글자 대문자 클래스의 사용.

## Verification (검증 방법)
구현 완료 후 다음 항목을 테스트합니다.
- [ ] 카테고리 탭 전환 시 에디토리얼 영역이 정상적으로 은폐되며 상품 그리드가 최상단에 붙는가?
- [ ] 카드 썸네일 이미지 마우스 호버 시 그레이스케일이 걷히며 줌 확대가 부드럽게 일어나는가?
- [ ] `upcoming` 과 `released` 상태 배지가 명확하게 시각적 대비를 이루는가?
- [ ] 로고(`dropcast*`) 및 메인 텍스트가 완벽히 소문자(lowercase) 상태를 지키는가?
- [ ] 모바일 환경에서 4열 그리드 및 프로세스 레이아웃이 1열 세로 배열로 자연스럽게 정렬되는가?
