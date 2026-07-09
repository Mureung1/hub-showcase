# 아맞다 (Amadda) Design System

## 1. Visual Theme & Atmosphere (핵심 인상 및 분위기)

> 저장해둔 인사이트를 필요한 순간에 조용히 다시 꺼내주는 개인 작업대.

아맞다는 단순 북마크 앱보다 "아, 맞다" 하고 잊었던 자료를 떠올리는 순간에 가깝다. 밝은 흰 배경, 옅은 회색 표면, 얇은 구분선, 절제된 파란 강조가 사용자의 링크와 메모를 먼저 보이게 한다.

전체 인상은 학생과 개인 창작자가 부담 없이 쓰는 차분한 생산성 도구다. 3D 캐릭터, 과한 SaaS 마케팅 톤, 장식용 그래픽보다 `꺼내보기`, 카드, 칩, CTA의 명확한 흐름을 우선한다.

## 2. Color Palette & Roles (색상 토큰과 역할)

색상은 임의의 유틸리티 이름이 아니라 CSS 변수 기준으로 정의한다.

### Core Tokens

| Token                   |     Value | Usage                                      |
| ----------------------- | --------: | ------------------------------------------ |
| `--color-bg`            | `#FFFFFF` | 앱 전체 배경                               |
| `--color-surface`       | `#F6F8FA` | 보조 표면, 하단 내비게이션, 입력 보조 영역 |
| `--color-card`          | `#FFFFFF` | 인사이트 카드, 패널                        |
| `--color-border`        | `#E6EAF0` | 기본 테두리와 구분선                       |
| `--color-border-strong` | `#B8C2CC` | 입력 focus, 선택 상태 경계                 |
| `--color-text`          | `#1F2226` | 제목, 본문, 핵심 정보                      |
| `--color-muted`         | `#5F6773` | 보조 설명, 도메인, 메타 텍스트             |
| `--color-disabled`      | `#A6AFBA` | 비활성 텍스트                              |

### Brand & Action

| Token                     |     Value | Usage                                 |
| ------------------------- | --------: | ------------------------------------- |
| `--color-primary`         | `#1458DD` | Primary CTA, 활성 탭, 주요 링크       |
| `--color-primary-hover`   | `#4A79DD` | Primary hover                         |
| `--color-primary-pressed` | `#0944C2` | Primary pressed                       |
| `--color-primary-soft`    | `#EFF6FF` | 선택된 칩, focus ring 배경, 옅은 강조 |
| `--color-accent`          | `#339EEE` | 보조 하이라이트, 정보성 강조          |

### Category Chips

카테고리 색상은 콘텐츠를 압도하지 않는 옅은 배경 + 진한 텍스트 조합만 사용한다.

| Role  | Background |      Text |
| ----- | ---------: | --------: |
| Blue  |  `#EFF6FF` | `#1458DD` |
| Green |  `#ECFDF5` | `#047857` |
| Amber |  `#FFFBEB` | `#B45309` |
| Rose  |  `#FFF1F2` | `#BE123C` |
| Slate |  `#F1F5F9` | `#475569` |

### Feedback

| Role    | Background |      Text | Usage                      |
| ------- | ---------: | --------: | -------------------------- |
| Success |  `#ECFDF5` | `#047857` | 저장 완료, 수정 완료       |
| Warning |  `#FFFBEB` | `#B45309` | 확인 필요, 중복 가능성     |
| Error   |  `#FEF2F2` | `#DC2626` | 저장 실패, 삭제, 입력 오류 |
| Info    |  `#EFF6FF` | `#1458DD` | 안내, 추천 상황            |

## 3. Typography Rules (타이포그래피 규칙)

**Font Family:** `Pretendard`, sans-serif. 숫자는 `font-variant-numeric: tabular-nums`를 적용한다.

| Role          | Size / Line | Weight | Usage                           |
| ------------- | ----------: | -----: | ------------------------------- |
| Screen Title  | 28px / 36px |    700 | 화면 최상단 제목                |
| Section Title | 22px / 30px |    700 | 홈/보관함 주요 섹션             |
| Card Title    | 17px / 24px |    700 | 인사이트 카드 제목              |
| Body          | 16px / 24px |    400 | 기본 본문, 입력값               |
| Label         | 14px / 20px |    600 | 입력 라벨, 버튼, 칩             |
| Meta          | 13px / 18px |    400 | 도메인, 보조 설명, 빈 상태 설명 |

텍스트는 읽기와 스캔을 우선한다. 긴 마케팅 문구, 중앙 정렬 남용, placeholder-only label은 사용하지 않는다.

## 4. Spacing & Layout (간격 및 레이아웃)

- **Base Unit:** 4px
- **Scale:** `4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64`
- **Radius:** `xs 6px`, `sm 8px`, `md 10px`, `lg 12px`, `full 999px`
- **Shadow:** 기본은 사용하지 않고, 필요한 경우 `0 4px 16px rgba(15, 23, 42, 0.08)`까지만 허용한다.
- **Content Width:** 앱 본문 최대 1120px, 모바일 좌우 여백 16px.
- **Grid:** 데스크톱 3열, 태블릿 2열, 모바일 1열. 보관함 검색은 카드 그리드를 쓰고, `꺼내보기`는 최대 6개 인사이트를 작업팩 섹션으로 보여준다.

Radius와 컴포넌트 크기는 WDS(Wanted Design System)의 실사용 수치를 참고하되, 브랜드 색상과 화면 구조는 아맞다 기준을 우선한다. 세부 도입 메모는 `docs/wds-adoption.md`를 따른다.

## 5. Core Components (핵심 컴포넌트)

| Component          | Rule                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `Button`           | Primary, Secondary, Ghost 3종. 높이 44px 이상. 기본 radius 10px, 작은 버튼 8px, 큰 CTA 12px.              |
| `TextInput`        | 라벨은 항상 보인다. 기본 radius 12px. Focus는 `--color-primary` 1px border + `--color-primary-soft` ring. |
| `SearchField`      | 보관함 검색에 사용. radius 12px, 본문 16px, reset/검색 아이콘 영역을 둔다.                                |
| `Chip`             | 카테고리/추천 상황에 사용. radius 8px 기본, 선택 상태는 배경과 텍스트 색을 함께 바꾼다.                   |
| `InsightCard`      | 썸네일, 제목, 도메인, 메모 일부, 카테고리 칩, 원문 열기 액션만 표시한다.                                  |
| `BottomNavigation` | 순서는 `보관함 / 홈 / 저장`. 현재 탭은 아이콘, 텍스트, 색상으로 함께 표시한다. 기본 높이는 56px 이상.     |
| `EmptyState`       | 짧은 이유 + 다음 행동 1개. "데이터가 없습니다"만 단독으로 쓰지 않는다.                                    |

### InsightCard

- Radius 8px, 1px `--color-border`, 배경 `--color-card`.
- 카드 전체 클릭과 `원문 열기` 버튼의 역할이 충돌하지 않게 한 가지 주 동작을 정한다.
- 메모나 카테고리가 없으면 해당 영역은 숨기고 빈 줄을 남기지 않는다.
- `미분류`는 필터로만 쓰고 카드 칩으로 표시하지 않는다.

### Chip

- 카테고리 칩은 `Category Chips` 팔레트에서 자동 배정한다.
- 추천 상황 칩은 `--color-primary-soft`를 기본 배경으로 사용한다.
- 칩 행은 모바일에서 가로 스크롤을 허용하되, 첫 칩이 잘리지 않아야 한다.

## 6. State Patterns (상태 규칙)

| Feature  | Empty                              | Loading                         | Error                           | Success                                         |
| -------- | ---------------------------------- | ------------------------------- | ------------------------------- | ----------------------------------------------- |
| 저장     | URL 입력을 바로 보여준다.          | 버튼에 진행 상태를 표시한다.    | 이유와 재시도 액션을 함께 둔다. | 저장 완료 후 카테고리/메모 제안을 보여준다.     |
| 보관함   | 저장 CTA를 제공한다.               | 카드 skeleton을 사용한다.       | 다시 불러오기 액션을 둔다.      | 최신 저장순 목록을 보여준다.                    |
| 검색     | 기본 목록으로 돌아갈 수 있게 한다. | 입력은 유지한다.                | 검색어를 잃지 않는다.           | 결과 개수를 과하게 강조하지 않는다.             |
| 꺼내보기 | 예시 상황 칩을 보여준다.           | 작업팩 영역만 대기 상태로 둔다. | 입력값을 유지하고 재시도한다.   | 유사도 기반 작업팩과 원문 열기 액션을 보여준다. |

## 7. Motion (모션)

- 기본 전환은 150-200ms, `ease-out`.
- 저장 완료, 칩 선택, focus, 결과 등장처럼 행동 확인에만 사용한다.
- 로그인 전 서비스 온보딩의 핵심 경험 예고편은 GSAP 기반 브랜드 시퀀스로 예외 허용한다.
- GSAP은 저장 카드가 현재 상황 문장 기준으로 작업팩처럼 모이는 장면에만 사용한다.
- 온보딩 첫 화면에서는 핵심 문장, 모션 미리보기, CTA가 한 viewport 안에 보여야 한다.
- 앱 내부 micro interaction은 Motion 또는 CSS transition을 우선한다.
- `prefers-reduced-motion`에서는 온보딩 시퀀스를 정적 작업팩 미리보기로 대체한다.
- 장식용 스크롤 애니메이션, 과한 hover lift, 반복 애니메이션은 사용하지 않는다.

## 8. Responsive & Accessibility (반응형과 접근성)

- 터치 타깃은 최소 44px.
- 본문 텍스트는 16px 미만으로 줄이지 않는다.
- 본문 대비는 WCAG AA 기준 4.5:1 이상을 목표로 한다.
- 모든 입력에는 visible label을 둔다.
- 키보드만으로 하단 내비게이션, 칩, 카드 액션, 모달 닫기가 가능해야 한다.
- 활성 탭과 선택 칩은 색상만이 아니라 `aria-current` 또는 `aria-pressed`로도 표현한다.

## 9. Do's and Don'ts (허용 및 금지 규칙)

### Do

- 콘텐츠가 먼저 보이게 한다.
- 저장은 빠르게, 정리는 선택적으로 느껴지게 한다.
- 토큰, spacing scale, 핵심 컴포넌트를 재사용한다.
- 빈 상태와 오류 상태에도 다음 행동을 둔다.

### Don't

- 임의 hex, 인라인 스타일, 토큰 밖 그림자를 추가하지 않는다.
- 깊은 그림자, 화려한 그라데이션, 장식용 캐릭터를 쓰지 않는다.
- 카드 안에 또 다른 카드를 중첩하지 않는다.
- `꺼내보기`를 AI 자동화처럼 과장해서 표현하지 않는다.
- `꺼내보기`에서 `기획 참고`, `디자인 참고`, `구현 참고` 같은 고정 분류 라벨을 사용자에게 노출하지 않는다.
