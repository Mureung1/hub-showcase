# Modu Brain Design System

이 문서는 `ui-ux-pro-max`의 디자인 시스템 검색 결과를 모두의 뇌 제품 결정에 맞게 조정한 UI 구현 기준이다. 새 화면을 만들 때 `design-system/modu-brain/pages/<page>.md`가 있으면 그 파일을 우선하고, 없으면 이 문서를 따른다.

## Product frame

- 제품 유형: 협업 맥락을 구조화하는 AI 지식관리 SaaS
- 사용자: 회의·리서치·피드백의 근거와 결정 변화를 함께 이해해야 하는 팀
- 스택: React 19, TypeScript, Vite
- 정보 우선순위: 관점 차이 → 미결 질문 → 결정 배경 → 요약
- 스타일: 차분한 Soft UI Evolution, content-first, light mode 기본
- 디자인 다이얼: variance 4/10, motion 3/10, density 6/10

## Visual tokens

| 역할 | 값 | CSS 변수 |
| --- | --- | --- |
| 페이지 배경 | `#f5f5f7` | `--color-page` |
| 기본 표면 | `#ffffff` | `--color-surface` |
| 보조 표면 | `#fafafc` | `--color-surface-subtle` |
| 기본 텍스트 | `#1d1d1f` | `--color-text` |
| 본문 텍스트 | `#333333` | `--color-text-body` |
| 보조 텍스트 | `#6e6e73` | `--color-text-muted` |
| 기본 경계 | `#e0e0e0` | `--color-border` |
| 강한 경계 | `#d2d2d7` | `--color-border-strong` |
| 주요 액션 | `#0066cc` | `--color-primary` |
| 주요 액션 hover | `#0071e3` | `--color-primary-hover` |
| 포커스 링 | `rgba(0, 102, 204, 0.24)` | `--color-focus-ring` |
| 성공 | `#1f7a3f` / `#e8f7ee` | `--color-success` / `--color-success-bg` |
| 경고 | `#8a5a00` / `#fff8ee` | `--color-warning` / `--color-warning-bg` |
| 오류 | `#b00020` / `#fff2f2` | `--color-danger` / `--color-danger-bg` |

AI 제품이라는 이유만으로 보라·핑크 그라데이션을 사용하지 않는다. 상태는 색만으로 표현하지 않고 텍스트나 아이콘을 함께 제공한다.

## Typography and spacing

- 시스템 한글 폰트를 우선해 추가 웹폰트 로딩과 한글 fallback 차이를 피한다.
- 본문은 최소 16px, line-height 1.5 이상을 기본으로 한다.
- 제목은 600–800, 라벨은 600–800, 본문은 400–500 굵기를 사용한다.
- 간격은 4/8px 리듬을 사용하며 기본 단계는 4, 8, 12, 16, 24, 32, 48, 64px이다.
- 입력과 작은 패널은 8px, 카드와 워크스페이스는 14px, 버튼·탭·배지는 pill radius를 사용한다.
- 그림자는 계층을 설명할 때만 사용하며 기본 카드는 `--shadow-card` 한 단계로 통일한다.

## Components and interaction

- 화면당 primary CTA는 하나만 둔다. 보조 액션은 outline 또는 text button으로 낮춘다.
- 버튼, 링크, 라디오 카드 등 모든 상호작용 영역은 최소 44×44px이다.
- 비동기 액션은 pending 문구를 보여주고 중복 제출을 막는다.
- 입력은 visible label, helper text, 필드 가까운 오류, `aria-live` 상태를 제공한다.
- 텍스트는 가능한 한 줄바꿈한다. 생략할 때는 전체 내용을 확인할 경로를 제공한다.
- 아이콘은 한 계열의 SVG를 사용하고 구조적 아이콘에 emoji를 사용하지 않는다.
- hover, pressed, disabled, focus-visible 상태가 서로 구분되어야 한다.

## Navigation and hierarchy

- 키보드 사용자를 위한 본문 건너뛰기 링크를 유지한다.
- 현재 위치는 `aria-current="page"`와 시각 상태로 함께 표시한다.
- 경로 변경 후 포커스를 주 콘텐츠 영역으로 이동한다.
- sticky header 아래에 콘텐츠가 가려지지 않아야 한다.
- 결과 화면은 단순 요약보다 관점·질문·근거의 연결을 먼저 보여준다.

## Responsive behavior

- 375, 768, 1024, 1440px에서 확인한다.
- 모바일에서는 핵심 콘텐츠를 먼저 보여주고 2열 레이아웃을 1열로 전환한다.
- 가로 스크롤을 기본 탐색 방식으로 사용하지 않는다. 탭처럼 필요한 경우에만 제한한다.
- 긴 한글, 참여자 이름, 외부 기록 제목이 카드 폭을 깨지 않도록 wrapping을 우선한다.
- fixed/sticky 요소와 스크롤 콘텐츠가 겹치지 않아야 한다.

## Motion

- micro-interaction은 150–240ms 범위의 opacity, color, transform만 사용한다.
- 모션은 상태 변화나 공간 관계를 설명할 때만 사용한다.
- `prefers-reduced-motion: reduce`에서 애니메이션과 부드러운 스크롤을 제거한다.
- 로딩이 300ms 이상 지속될 수 있으면 status, spinner 또는 skeleton을 제공한다.

## Pre-delivery checklist

- [ ] 키보드만으로 모든 기능 사용 가능
- [ ] focus-visible 링과 논리적 tab 순서 확인
- [ ] 일반 텍스트 대비 4.5:1 이상
- [ ] 모든 주요 터치 타깃 44×44px 이상
- [ ] 로딩·성공·오류·빈 상태와 복구 액션 확인
- [ ] 375 / 768 / 1024 / 1440px에서 가로 넘침 없음
- [ ] reduced motion에서 핵심 기능 유지
- [ ] 구조적 emoji 아이콘과 임의의 raw color 추가 없음
- [ ] `npm test`, `npm run build`, `git diff --check` 통과
