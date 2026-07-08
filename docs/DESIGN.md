# DESIGN.md — TMI Design System

## 1. Product Identity

**TMI**는 처음 만난 사람, 어색한 사이, 연인, 직장 동료와의 대화를 자연스럽게 시작할 수 있도록 돕는 대화 주제 추천 서비스이다.

이 서비스의 UI는 사용자가 부담 없이 들어와서, 빠르게 상황을 선택하고, 바로 사용할 수 있는 대화 주제를 얻는 경험을 중심으로 설계한다.

### Design Concept

**부담 없는 대화 코치**

TMI는 차갑고 복잡한 AI 도구처럼 보이면 안 된다.
친구가 옆에서 “이런 질문 한번 해봐”라고 알려주는 듯한 부드럽고 친근한 서비스처럼 보여야 한다.

### Reference Direction

- **Intercom**: 대화형 UI, 친근한 말투, floating card, conversational pattern
- **Cal.com**: 깔끔한 선택 카드, 단순한 폼, 넓은 여백, 명확한 CTA
- **Mintlify**: 읽기 쉬운 정보 구조, 부드러운 히어로 그라디언트, 정돈된 카드 레이아웃

---

## 2. Visual Principles

### 2.1 Friendly, not childish

전체 분위기는 친근해야 하지만 유치하면 안 된다.
이모지와 아이콘은 사용할 수 있지만 과하게 장식하지 않는다.

### 2.2 Simple first, rich after

첫 화면에서는 선택지를 최소화한다.
결과 화면에서는 질문, 이유, 후속 질문, 피해야 할 말까지 풍부하게 제공한다.

### 2.3 Conversation-first UI

모든 화면은 “대화”를 중심으로 설계한다.
결과는 단순 리스트가 아니라 대화 카드, 말풍선, 추천 코치 카드처럼 보여야 한다.

### 2.4 Mobile-first

TMI는 실제 대화 상황에서 빠르게 꺼내 쓰는 서비스이므로 모바일 화면을 우선한다.
데스크톱은 모바일 구조를 넓게 확장한 형태로 만든다.

---

## 3. Color System

TMI는 **하늘색 + 흰색 + 차분한 남색 텍스트**를 기본으로 한다.

색상 비율은 다음을 따른다.

- White / Off-white: 80%
- Sky Blue Accent: 15%
- Dark Text: 5%

### 3.1 Brand Colors

```css
:root {
  --color-brand-primary: #38bdf8;
  --color-brand-primary-hover: #0ea5e9;
  --color-brand-primary-soft: #e0f2fe;
  --color-brand-primary-muted: #bae6fd;

  --color-brand-secondary: #7dd3fc;
  --color-brand-gradient-from: #e0f2fe;
  --color-brand-gradient-to: #ffffff;
}
```

### 3.2 Surface Colors

```css
:root {
  --color-background: #fafcff;
  --color-surface: #ffffff;
  --color-surface-soft: #f8fafc;
  --color-surface-blue: #f0f9ff;

  --color-border: #e2e8f0;
  --color-border-blue: #bae6fd;
  --color-divider: #e5e7eb;
}
```

### 3.3 Text Colors

```css
:root {
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #64748b;
  --color-text-muted: #94a3b8;
  --color-text-on-primary: #ffffff;
}
```

### 3.4 Semantic Colors

```css
:root {
  --color-success: #22c55e;
  --color-success-soft: #dcfce7;

  --color-warning: #f59e0b;
  --color-warning-soft: #fef3c7;

  --color-danger: #ef4444;
  --color-danger-soft: #fee2e2;
}
```

### Usage Rules

- CTA, 선택 상태, 포커스 링, 강조 태그에만 하늘색을 사용한다.
- 배경 전체를 파랗게 칠하지 않는다.
- 카드와 주요 콘텐츠 영역은 대부분 흰색으로 유지한다.
- 중요한 질문 카드는 `--color-surface`를 사용하고, 보조 설명 카드는 `--color-surface-blue`를 사용할 수 있다.

---

## 4. Typography

기본 폰트는 한국어 가독성을 고려해 `Pretendard`를 사용한다.
영문/숫자도 함께 자연스럽게 보이도록 한다.

```css
:root {
  --font-sans: 'Pretendard', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Type Scale

```css
:root {
  --text-display: 48px;
  --text-h1: 36px;
  --text-h2: 28px;
  --text-h3: 22px;
  --text-title: 18px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-caption: 13px;
  --text-micro: 12px;
}
```

### Typography Rules

```css
.hero-title {
  font-size: clamp(32px, 6vw, 56px);
  line-height: 1.08;
  letter-spacing: -0.04em;
  font-weight: 700;
}

.section-title {
  font-size: clamp(24px, 4vw, 36px);
  line-height: 1.18;
  letter-spacing: -0.03em;
  font-weight: 700;
}

.card-title {
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: -0.01em;
  font-weight: 600;
}

.body {
  font-size: 16px;
  line-height: 1.6;
  font-weight: 400;
}

.caption {
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text-tertiary);
}
```

### Copy Tone

문장은 짧고 부드럽게 작성한다.

좋은 예시:

- 오늘 어떤 대화를 시작해볼까요?
- 지금 상황에 맞는 질문을 골라드릴게요.
- 이 질문은 부담 없이 대화를 열기 좋아요.
- 조금 더 깊게 이어가고 싶다면 이렇게 물어보세요.

피해야 할 예시:

- AI 기반 대화 최적화 솔루션
- 관계 맥락 기반 질문 생성 시스템
- 사용자 입력 기반 추천 알고리즘 실행

---

## 5. Layout System

### 5.1 Container

```css
.container {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (max-width: 768px) {
  .container {
    padding: 0 20px;
  }
}
```

### 5.2 Spacing Scale

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

### Layout Rules

- 화면 상단 히어로 영역은 넓은 여백을 사용한다.
- 카드 내부 padding은 모바일 `20px`, 데스크톱 `24px~32px`를 사용한다.
- 주요 섹션 간 간격은 `64px~96px`를 사용한다.
- 모바일에서는 모든 주요 카드가 1열로 쌓인다.
- 데스크톱에서는 상황 선택 카드가 2열 또는 3열 그리드가 된다.

---

## 6. Radius & Elevation

TMI는 부드러운 인상을 위해 둥근 모서리를 적극적으로 사용한다.

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 9999px;

  --shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04);
  --shadow-card-hover: 0 4px 12px rgba(15, 23, 42, 0.08), 0 16px 32px rgba(14, 165, 233, 0.08);
  --shadow-floating: 0 24px 64px rgba(15, 23, 42, 0.12);
}
```

### Elevation Rules

- 기본 카드는 hairline border 중심으로 표현한다.
- shadow는 매우 은은하게 사용한다.
- hover 상태에서만 살짝 떠오르는 느낌을 준다.
- glassmorphism, 강한 neon shadow, 과한 blur는 사용하지 않는다.

---

## 7. Components

## 7.1 Button

### Primary Button

주요 CTA에 사용한다.

예시:

- 대화 주제 추천받기
- 다시 추천받기
- 이 질문 저장하기

```css
.button-primary {
  height: 48px;
  padding: 0 22px;
  border-radius: var(--radius-pill);
  background: var(--color-brand-primary);
  color: var(--color-text-on-primary);
  font-size: 15px;
  font-weight: 700;
  border: none;
  box-shadow: 0 8px 20px rgba(56, 189, 248, 0.24);
}

.button-primary:hover {
  background: var(--color-brand-primary-hover);
  transform: translateY(-1px);
}
```

### Secondary Button

보조 액션에 사용한다.

```css
.button-secondary {
  height: 48px;
  padding: 0 22px;
  border-radius: var(--radius-pill);
  background: #ffffff;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  font-size: 15px;
  font-weight: 600;
}
```

### Ghost Button

카드 내부의 작은 액션에 사용한다.

```css
.button-ghost {
  height: 40px;
  padding: 0 14px;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.button-ghost:hover {
  background: var(--color-surface-blue);
  color: var(--color-brand-primary-hover);
}
```

---

## 7.2 Situation Card

상황 선택 화면의 핵심 컴포넌트이다.

예시:

- 처음 만난 사람
- 어색한 모임
- 연인
- 직장/학교
- 친구와 더 깊은 대화

```css
.situation-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: 160ms ease;
}

.situation-card:hover {
  border-color: var(--color-border-blue);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.situation-card[data-selected='true'] {
  background: var(--color-surface-blue);
  border-color: var(--color-brand-primary);
}
```

### Content Structure

```txt
[Icon Bubble]
상황 이름
짧은 설명
추천 태그
```

예시:

```txt
🌱 처음 만난 사람
부담 없이 시작하는 가벼운 질문
#아이스브레이킹 #가벼움
```

---

## 7.3 Tone Chip

대화 분위기 선택에 사용한다.

예시:

- 가볍게
- 재밌게
- 진지하게
- 설레게
- 어색함 풀기
- 깊은 대화

```css
.tone-chip {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.tone-chip[data-selected='true'] {
  background: var(--color-brand-primary-soft);
  border-color: var(--color-brand-primary);
  color: var(--color-brand-primary-hover);
}
```

---

## 7.4 Question Result Card

추천 결과의 가장 중요한 카드이다.
단순 리스트가 아니라 하나의 대화 코칭 카드처럼 보여야 한다.

```css
.question-card {
  padding: 28px;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  border: 1px solid var(--color-border-blue);
  box-shadow: var(--shadow-card);
}

.question-main {
  font-size: clamp(22px, 4vw, 32px);
  line-height: 1.35;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: var(--color-text-primary);
}

.question-reason {
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-blue);
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.6;
}
```

### Content Structure

```txt
추천 질문

“요즘 가장 자주 보는 콘텐츠가 뭐야?”

왜 좋은 질문인가요?
처음 만난 사이에서도 부담 없이 답할 수 있고,
상대의 관심사를 자연스럽게 알 수 있어요.
```

---

## 7.5 Follow-up Question List

후속 질문은 작은 카드 또는 말풍선 형태로 제공한다.

```css
.follow-up-list {
  display: grid;
  gap: 10px;
}

.follow-up-item {
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 15px;
  line-height: 1.5;
}
```

예시:

```txt
1. 그걸 보게 된 계기가 있어?
2. 비슷한 거 추천해줄 수 있어?
3. 그 콘텐츠에서 제일 재밌던 포인트가 뭐야?
```

---

## 7.6 Avoid Card

대화 중 피해야 할 말을 알려주는 카드이다.
강한 경고처럼 보이지 않게 부드럽게 표현한다.

```css
.avoid-card {
  padding: 18px;
  border-radius: var(--radius-lg);
  background: var(--color-warning-soft);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.avoid-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #92400e;
}

.avoid-card-body {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.55;
  color: #78350f;
}
```

카피 예시:

```txt
이 말은 피하는 게 좋아요
처음 만난 사이에서는 너무 개인적인 연애사나 수입 관련 질문은 부담스러울 수 있어요.
```

---

## 7.7 Chat Bubble

TMI가 대화형 서비스처럼 느껴지도록 일부 화면에서는 말풍선 UI를 사용한다.

```css
.chat-bubble {
  max-width: 80%;
  padding: 14px 16px;
  border-radius: 20px;
  font-size: 15px;
  line-height: 1.55;
}

.chat-bubble.assistant {
  background: var(--color-surface-blue);
  color: var(--color-text-primary);
  border-bottom-left-radius: 6px;
}

.chat-bubble.user {
  margin-left: auto;
  background: var(--color-brand-primary);
  color: white;
  border-bottom-right-radius: 6px;
}
```

사용 위치:

- 온보딩 안내
- 추천 결과 설명
- 대화 시뮬레이션
- “이렇게 이어가 보세요” 예시

---

## 7.8 Input

사용자가 직접 상황을 입력하는 경우에 사용한다.

```css
.input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 15px;
}

.input::placeholder {
  color: var(--color-text-muted);
}

.input:focus {
  outline: none;
  border-color: var(--color-brand-primary);
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.16);
}
```

Placeholder 예시:

```txt
예: 첫 소개팅인데 어색하지 않은 질문이 필요해요
예: 팀 회식 자리에서 자연스럽게 꺼낼 주제가 필요해요
```

---

## 8. Page Structure

## 8.1 Landing / Home

첫 화면은 사용자가 바로 행동할 수 있게 구성한다.

### Structure

```txt
Header
Hero
Situation Selector
Tone Selector
Primary CTA
Example Result Preview
```

### Hero Copy

```txt
오늘 어떤 대화를 시작해볼까요?

처음 만난 사람부터 연인, 직장 동료까지.
상황에 맞는 대화 주제와 이어갈 질문을 추천해드릴게요.
```

### Hero Layout

- 왼쪽: 제목, 설명, CTA
- 오른쪽: 대화 카드 미리보기
- 모바일: 제목 → CTA → 미리보기 순서

---

## 8.2 Situation Selection Page

상황 선택은 카드 그리드로 구성한다.

### Recommended Categories

```txt
처음 만난 사람
어색한 모임
연인
친구
직장/학교
깊은 대화
```

### UI Rules

- 한 화면에서 너무 많은 선택지를 보여주지 않는다.
- 기본은 6개 이하로 유지한다.
- 선택된 카드는 하늘색 배경과 border로 표시한다.
- 다음 단계로 넘어가기 전 선택 상태가 명확해야 한다.

---

## 8.3 Result Page

결과 화면은 TMI의 핵심 가치가 드러나는 화면이다.

### Structure

```txt
Result Header
Main Question Card
Reason Card
Follow-up Questions
Avoid Card
Tone Change Actions
Save / Regenerate Buttons
```

### Result Example

```txt
추천 질문

“요즘 가장 자주 보는 콘텐츠가 뭐야?”

왜 좋은 질문인가요?
처음 만난 사이에서도 부담 없이 답할 수 있고,
상대의 취향과 관심사를 자연스럽게 알 수 있어요.

이렇게 이어가 보세요
1. 그걸 보게 된 계기가 있어?
2. 비슷한 거 추천해줄 수 있어?
3. 그 콘텐츠에서 제일 재밌던 포인트가 뭐야?

이 말은 피하는 게 좋아요
처음부터 너무 개인적인 질문으로 넘어가면 부담스러울 수 있어요.
```

---

## 8.4 Saved Questions

저장한 질문은 간단한 리스트 카드로 제공한다.

```txt
저장한 질문
- 처음 만난 사람
- 연인
- 직장/학교
```

### UI Rules

- 저장된 질문은 상황 태그와 함께 보여준다.
- 다시 보기, 복사하기, 삭제하기 액션을 제공한다.
- 카드 높이는 낮게 유지해 빠르게 훑어볼 수 있게 한다.

---

## 9. Navigation

TMI의 네비게이션은 최소화한다.

### Desktop Header

```txt
TMI       홈   저장한 질문   사용법           시작하기
```

### Mobile Header

```txt
TMI                         Menu
```

### Header Style

```css
.header {
  height: 72px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  background: rgba(250, 252, 255, 0.86);
  backdrop-filter: blur(16px);
}
```

### Rules

- 헤더는 얇고 가볍게 유지한다.
- 메뉴를 많이 넣지 않는다.
- 핵심 CTA는 항상 접근 가능해야 한다.

---

## 10. Motion

TMI의 모션은 부드럽고 짧게 사용한다.

```css
:root {
  --motion-fast: 120ms ease;
  --motion-base: 180ms ease;
  --motion-slow: 260ms ease;
}
```

### Motion Rules

- 카드 hover: 살짝 위로 이동
- 선택 상태: 배경색과 border 부드럽게 전환
- 결과 생성: skeleton 또는 soft fade-in 사용
- 과한 bounce, rotate, particle 효과는 사용하지 않는다.

---

## 11. Responsive Behavior

### Breakpoints

```css
:root {
  --breakpoint-mobile: 480px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1280px;
}
```

### Mobile

- 모든 카드는 1열
- CTA는 화면 하단 sticky 사용 가능
- 헤더 메뉴는 최소화
- 히어로 타이틀은 32px 내외
- 터치 타겟은 최소 44px

### Tablet

- 상황 카드는 2열
- 결과 화면은 단일 컬럼 유지
- 미리보기 카드는 오른쪽에 배치 가능

### Desktop

- 상황 카드는 3열
- 히어로는 좌우 2-column
- 결과 화면은 중앙 max-width 760px
- 사이드에 추천 팁 또는 저장 액션 배치 가능

---

## 12. Accessibility

### Rules

- 텍스트 대비는 충분히 확보한다.
- 하늘색만으로 선택 상태를 표현하지 않는다. border, check icon, 배경 변화를 함께 사용한다.
- 모든 버튼과 카드 선택 요소는 키보드 포커스 상태가 보여야 한다.
- 터치 타겟은 최소 44px 이상으로 만든다.
- placeholder만으로 입력 목적을 설명하지 않는다. label 또는 helper text를 함께 제공한다.

### Focus Ring

```css
.focus-ring:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.24);
}
```

---

## 13. Do / Don't

### Do

- 흰색 배경과 하늘색 포인트를 사용한다.
- 둥근 카드와 부드러운 shadow를 사용한다.
- 상황 선택은 카드형 UI로 만든다.
- 결과는 질문, 이유, 후속 질문, 주의할 말로 구조화한다.
- 문장은 짧고 친근하게 작성한다.
- 모바일에서 바로 쓰기 좋게 만든다.

### Don't

- 전체 배경을 진한 파란색으로 칠하지 않는다.
- 너무 많은 질문을 한 번에 보여주지 않는다.
- 대시보드처럼 복잡하게 만들지 않는다.
- 개발자 도구처럼 차갑고 기술적으로 보이게 하지 않는다.
- 그라디언트를 과하게 사용하지 않는다.
- 의미 없는 일러스트나 장식 요소를 남발하지 않는다.

---

## 14. Example Screen Prompt for AI Coding Agent

Use this prompt when asking an AI coding agent to build or redesign TMI UI.

```txt
DESIGN.md 기준으로 TMI 메인 화면과 추천 결과 화면을 리디자인해줘.

디자인 방향:
- Intercom처럼 친근한 대화형 UI
- Cal.com처럼 깔끔한 선택 카드와 단순한 CTA
- Mintlify처럼 읽기 좋은 정보 구조와 부드러운 하늘색 히어로 분위기

서비스 플로우:
1. 사용자가 상황을 선택한다.
2. 원하는 대화 분위기를 선택한다.
3. 대화 주제를 추천받는다.
4. 추천 결과에서 메인 질문, 이유, 후속 질문, 피해야 할 말을 확인한다.

UI 요구사항:
- 하늘색 + 흰색 기반
- 모바일 우선
- 둥근 카드
- 넓은 여백
- 선택 상태가 명확한 상황 카드
- 결과는 단순 리스트가 아니라 대화 코치 카드처럼 구성
- CTA는 pill button
- hover/focus/selected 상태 구현
- 접근성 고려
```

---

## 15. Suggested Component Names

```txt
Header
HeroSection
SituationCard
SituationSelector
ToneChip
ToneSelector
QuestionResultCard
FollowUpQuestionList
AvoidTipCard
SavedQuestionCard
ChatBubble
PrimaryButton
SecondaryButton
```

---

## 16. Final Direction

TMI의 디자인은 다음 한 문장으로 정리한다.

**하늘색과 흰색을 기반으로, 사용자가 부담 없이 상황을 고르고 바로 대화 질문을 얻을 수 있는 부드러운 카드형 대화 코치 UI.**
