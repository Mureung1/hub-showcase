# ICU Design Brief

## Product

ICU는 초급·중급 개발자가 오늘 학습할 내용을 정하고, 커리큘럼을 따라 코드를 작성하고, 실행 피드백과 복습 기록을 연결하는 AI 코딩 튜터입니다. 사용자 화면에서는 `ICU`를 사용하고 `DevChat`은 저장소와 기획 이름으로만 사용합니다.

## Product Principles

- Today first: 첫 화면에서 지금 해야 할 학습과 다음 행동을 바로 알 수 있어야 합니다.
- Learning before files: 파일 탐색보다 커리큘럼, 미션, 피드백, 복습 맥락을 우선합니다.
- IDE when needed: 실제 학습 세션에서만 편집기와 실행 결과를 중심에 둡니다.
- Clear current step: 모든 화면은 현재 단계와 다음 행동을 함께 보여줍니다.
- Trust through sources: AI 설명에는 가능한 경우 공식 문서 근거를 연결합니다.
- Beginner-safe density: 반복 사용에 효율적이되 초보자가 길을 잃지 않는 밀도를 유지합니다.
- Theme-ready UI: 핵심 표면과 상태는 라이트·다크 테마에서 같은 의미를 유지합니다.

## Shared Visual System

- 생산성 도구처럼 차분한 표면과 명확한 정보 계층을 사용합니다.
- 편집기와 터미널은 두 테마 모두 어두운 표면을 사용합니다.
<!-- Previous brand color direction kept for audit:
- 주요 행동, 선택, focus에는 cyan과 deep blue를 사용합니다.
- orange는 완료, 환영, 중요한 강조에 제한적으로 사용합니다.
-->
- 현재 브랜드 화면은 흰색 네비게이터와 흰색 카드 표면을 유지하고, 콘텐츠 배경은 #e8f1fa에서 #d7e8fb로 이어지는 더 진한 blue-gray gradient를 사용합니다.
- 첫 화면의 따뜻한 진입감은 좌상단 warm tone #ffecd2로 제한하고, 주요 CTA와 선택 상태는 명확한 blue 계열을 우선합니다.
- 카드 경계는 #d5deea, 현재/활성 행은 #e8f2ff를 기본으로 사용해 정보 대비를 확보합니다.
- Git Lab의 commit node와 성공 상태에는 green을 사용할 수 있습니다.
- 반경은 `8px` 이하를 기본으로 하고 카드 중첩과 장식용 gradient를 피합니다.
- 앱 전역 폰트를 우선하고 UI fallback은 system sans, 코드는 monospace를 사용합니다.
- 사이드바 로고(`AppShell`의 `.brand`, "ICU / I CODE U")는 예외적으로 `Cloudsofa_namgim-Regular`를 사용하고, 그 외 모든 화면은 전역 폰트 `LINE Seed KR`을 사용합니다.

## Design Tokens

```css
:root {
  --color-light-bg: #f4f6f8;
  --color-light-surface: #ffffff;
  --color-light-surface-subtle: #fbfcfe;
  --color-light-text: #172033;
  --color-light-text-strong: #101828;
  --color-light-text-muted: #64748b;
  --color-light-border: #d3dce8;

  --color-dark-bg: #07111f;
  --color-dark-surface: #0f1b2d;
  --color-dark-surface-subtle: #13243a;
  --color-dark-text: #e5edf7;
  --color-dark-text-strong: #f8fafc;
  --color-dark-text-muted: #94a3b8;
  --color-dark-border: #25364d;

  /*
   * Previous Workday-inspired brand accents kept for audit:
   * --color-brand-orange: #ff8a1c;
   * --color-brand-pink: #f3b8d8;
   * --color-brand-cyan: #35c8f4;
   * --color-brand-blue: #07003d;
   * --color-brand-navy: #112b5f;
   */
  --color-brand-page-bg: #e8f1fa;
  --color-brand-page-bg-deep: #d7e8fb;
  --color-brand-page-bg-warm: #ffecd2;
  --color-brand-surface: #ffffff;
  --color-brand-surface-subtle: #f8fbff;
  --color-brand-border: #d5deea;
  --color-brand-active-row: #e8f2ff;
  --color-brand-primary: #0057d9;
  --color-brand-primary-strong: #003b8f;
  --color-brand-accent-cyan: #35bdf4;
  --color-brand-accent-orange: #ff8a1c;
  --color-editor-bg: #151a24;
  --color-editor-text: #dbe4ef;
}
```

## Korean Copy

- 자연스럽고 구체적인 한국어 행동 문구를 사용합니다.
- `실행`, `다시 실행`, `이어서 학습하기`, `목표 보기`처럼 결과를 예측할 수 있는 동사를 우선합니다.
- 오류는 원인과 다음 행동을 함께 설명하고 사용자를 탓하는 표현을 피합니다.
- 코드 용어, 파일명, API 이름, 공식 문서 제목을 제외한 임시 영문 문구를 노출하지 않습니다.
- mock 수치는 프로토타입 문맥에서만 사용하고 실제 운영 지표처럼 표현하지 않습니다.

## Interaction and Accessibility

- 주요 버튼은 가능한 경우 높이 `44px` 이상을 유지합니다.
- 모든 상호작용 요소에 보이는 keyboard focus 상태를 제공합니다.
- 색상만으로 완료, 실패, 선택, graph 상태를 전달하지 않고 텍스트나 형태를 함께 사용합니다.
- 긴 설명은 읽기 쉬운 줄 길이를 유지합니다.
- navigation, status, form, editor, terminal, graph, result에는 의미에 맞는 semantic element와 label을 사용합니다.
- motion은 상태 이해를 돕는 범위로 제한하고 `prefers-reduced-motion`을 존중합니다.

## Responsive Behavior

- desktop을 기본 대상으로 하되 좁은 폭에서도 주요 행동과 현재 학습 맥락이 먼저 보여야 합니다.
- Today Hub는 이어서 학습하기를 상단에 유지합니다.
- Workspace는 커리큘럼, 코드, 결과를 tab이나 순차 영역으로 전환할 수 있습니다.
- Git Lab은 terminal, 현재 상태, 목표 비교의 읽기 순서를 보존합니다.

## Canonical Screen Sources

- Today Learning Hub: [today-learning.md](../features/today-learning.md)
- Learning Workspace IDE: [learning-workspace.md](../features/learning-workspace.md)
- Git Branching Lab: [git-branching-lab.md](../features/git-branching-lab.md)
- Figma handoff: [figma-handoff.md](./figma-handoff.md)

## Validation

- 현재 학습 목표와 다음 행동이 명확한지 확인합니다.
- 텍스트가 버튼, 카드, panel, graph label에서 잘리지 않는지 확인합니다.
- hover, focus, active, selected, disabled 상태를 확인합니다.
- 한국어 copy와 UTF-8 인코딩을 확인합니다.
- UI 코드 변경 시 `npm run lint`, `npm test`, `npm run build`를 실행합니다.
