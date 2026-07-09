# UniRadar Design Guide

이 문서는 첨부된 UniRadar 대시보드 이미지를 기반으로, 웹 페이지 구현 및 이후 스킬화를 위한 디자인 기준을 정리한다. 목표는 대학생이 장학금, 공모전, 대외활동, 봉사, 지원사업을 빠르게 탐색하고 저장하며 마감 태스크까지 관리할 수 있는 신뢰감 있는 에이전트형 대시보드다.

## 1. Product Identity

- 서비스명: `UniRadar`
- 한 줄 설명: 대학생 맞춤형 기회 탐색 에이전트
- 핵심 인상: 신뢰감, 정돈됨, 빠른 탐색, AI 보조, 학업 친화적
- 사용자 감정 목표: “내 조건에 맞는 기회를 놓치지 않고 관리하고 있다.”

## 2. Visual Direction

이미지는 밝은 SaaS 대시보드 스타일이다. 전체 배경은 거의 흰색에 가까운 차가운 회색이며, 핵심 액션과 추천 영역은 선명한 블루를 사용한다.

- 기본 배경: 매우 옅은 블루 그레이
- 주요 카드: 흰색 또는 옅은 유리감이 있는 흰색
- 핵심 포인트: 강한 블루 그라데이션
- 보조 상태색: 성공은 그린, 경고/마감은 레드와 오렌지, 카테고리는 블루/퍼플/오렌지/그린
- 전체 형태: 둥근 카드와 얕은 그림자를 쓰되, 구현 시 카드 radius는 8px 기준을 유지한다.

## 3. Color Tokens

```css
:root {
  --color-bg: #f6f8fc;
  --color-surface: #ffffff;
  --color-surface-soft: #f8fafc;
  --color-border: #e2e8f0;

  --color-text: #101828;
  --color-text-muted: #667085;
  --color-text-subtle: #94a3b8;

  --color-primary: #2563ff;
  --color-primary-strong: #1d4ed8;
  --color-primary-soft: #eef4ff;
  --color-primary-gradient-start: #2458ff;
  --color-primary-gradient-end: #3b82f6;

  --color-success: #16a34a;
  --color-success-soft: #ecfdf3;
  --color-warning: #f59e0b;
  --color-warning-soft: #fff7ed;
  --color-danger: #ef4444;
  --color-danger-soft: #fef2f2;
  --color-purple: #7c3aed;
  --color-purple-soft: #f3e8ff;
}
```

## 4. Typography

- Primary font: `Pretendard`, `Inter`, `Noto Sans KR`, system sans-serif
- Base size: 14px to 15px
- Page title/card title: 20px to 24px
- Section title: 16px to 18px
- Card body: 13px to 14px
- Metadata: 12px to 13px
- Numeric dashboard metrics: 24px to 28px, bold

Text should be compact and scannable. Avoid oversized marketing-style headings inside the dashboard.

## 5. Layout

### Desktop Frame

The desktop screen uses a fixed top bar, left navigation rail, and dashboard content area.

- Top bar height: about 72px
- Left sidebar width: about 236px to 248px
- Content padding: 24px to 32px
- Main content grid: two-column composition
  - Left/main column: recommendations and analysis
  - Right column: profile summary, tasks, saved notices

Recommended CSS structure:

```css
.app-shell {
  min-height: 100vh;
  background: var(--color-bg);
}

.topbar {
  height: 72px;
}

.layout {
  display: grid;
  grid-template-columns: 244px minmax(0, 1fr);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.55fr);
  gap: 20px;
}
```

### First View Composition

The first viewport should show:

1. Left sidebar navigation
2. Top search bar and mock mode badge
3. Hero recommendation summary card
4. Profile summary
5. Notice analysis input
6. Deadline tasks
7. Opportunity cards
8. Saved opportunities

The primary experience should be the dashboard itself, not a landing page.

## 6. Top Bar

Top bar elements:

- Logo group
  - Circular radar icon
  - `UniRadar`
  - Subtitle: `대학생 맞춤형 기회 탐색 에이전트`
- Search input
  - Placeholder: `키워드, 기관명, 공고명으로 검색하세요`
  - Search icon on the left
  - Keyboard hint on the right
- Mode badge
  - Text: `현재 mock 분석 모드`
  - Icon: flask/beaker style
- Notification bell with count badge
- User avatar and profile summary

Top bar should feel operational and quiet. Search is central because discovery is the core workflow.

## 7. Sidebar

Sidebar menu order:

1. 대시보드
2. 프로필
3. 기회 추천
4. 저장한 공고
5. 마감 태스크
6. 설정

Bottom area:

- Premium upgrade panel
- 도움말
- 의견 보내기

Active menu state:

- Soft blue background
- Strong blue icon/text
- No heavy border

## 8. Key Components

### Recommendation Hero Card

The hero card is the emotional center of the dashboard.

- Background: blue gradient
- Title: `오늘의 추천 기회`
- Subtitle: personalized short copy
- Right metadata: `업데이트: 1시간 전`
- Inner metric tiles:
  - 추천 공고 수
  - 마감 임박
  - 저장한 공고

Metric tiles use translucent white panels on top of the gradient.

### Profile Summary Card

Purpose: show why the recommendations are personalized.

Fields:

- 학교
- 학년
- 전공
- 관심 분야
- 활동 가능 지역
- 팀 참여 가능 여부

Use small square icons with blue-tinted backgrounds.

### Notice Analysis Card

Purpose: let users paste a URL or raw notice text.

Fields:

- URL input
- Raw text textarea
- Character counter
- Primary button: `분석하기`

Helper copy:

- `지원 자격, 우대 사항, 제출 서류 등을 분석해 드려요.`

In mock mode, analysis should not imply a real AI call. Always show the mock mode badge somewhere visible.

### Deadline Task Card

Rows:

- Checkbox
- Task title
- Due date
- D-day pill

State rules:

- Todo: empty checkbox
- Done: filled blue checkbox
- D-day red/orange depending on urgency

Actions:

- `전체 보기`
- `+ 새 태스크 추가`

### Opportunity Card

Fields:

- Category chip
- Title
- Organizer
- Date/deadline
- Match status
- Score ring
- Matched reasons
- Save button

Card should remain compact. Avoid long prose; use two or three bullet reasons.

Category chip colors:

- 장학금: blue
- 공모전: purple
- 대외활동: orange
- 봉사: green
- 지원사업: teal

### Saved Opportunities Card

Simple list format:

- Category chip
- Title
- Date
- `전체 보기`
- `저장한 공고 더 보기`

This is a lightweight reminder panel, not a full table.

## 9. Data Shape

Keep these JSON shapes stable so mock mode can later be replaced with a real model response.

### Profile

```json
{
  "school": "서울대학교",
  "grade": 3,
  "majors": ["컴퓨터공학부"],
  "interests": ["AI", "데이터사이언스", "개발"],
  "regions": ["서울", "경기"],
  "canJoinTeam": true,
  "availableHoursPerWeek": 8
}
```

### Opportunity Input

```json
{
  "title": "2026 AI 소프트웨어 공모전 참가자 모집",
  "sourceUrl": "https://example.com/notice/123",
  "category": "contest",
  "deadline": "2026-08-31",
  "rawText": "공고 본문 텍스트"
}
```

### Analysis Result

```json
{
  "mode": "mock",
  "opportunity": {
    "title": null,
    "organizer": null,
    "category": "unknown",
    "deadline": null,
    "target": null,
    "eligibility": [],
    "preferred": [],
    "requiredDocuments": [],
    "benefits": [],
    "activityPeriod": null,
    "sourceUrl": null,
    "uncertainFields": []
  },
  "match": {
    "status": "insufficient_info",
    "score": 0,
    "summary": "",
    "matchedReasons": [],
    "missingInfo": [],
    "disqualifyingReasons": [],
    "nextActions": []
  },
  "tasks": []
}
```

### Task

```json
{
  "id": "task-1",
  "title": "지원 자격 최종 확인",
  "dueDate": "2026-08-21",
  "status": "todo"
}
```

## 10. Interaction Rules

### Profile

- User can create and edit profile.
- Profile is saved to localStorage.
- Profile summary updates immediately after save.

### Opportunity Analysis

- User can choose a sample notice or paste a custom notice.
- `분석하기` runs mock analysis.
- No real external AI call should happen in mock mode.
- Result appears as a match card and can be saved.

### Save Opportunity

- Saved opportunities persist in localStorage.
- Duplicate saves should be prevented by stable ID or source URL.
- Saved item can be deleted.

### Tasks

- Tasks are generated from analysis.
- Task status can be toggled between `todo` and `done`.
- Task state persists in localStorage.

### Filters and Sorting

Saved opportunities need:

- Filter: 전체, 장학금, 공모전, 대외활동, 봉사, 지원사업
- Sort:
  - 마감 임박순
  - 추천 점수 높은 순
  - 최근 분석순

## 11. Empty, Loading, Error States

Empty states should be quiet and actionable.

Examples:

- No profile: `프로필을 입력하면 맞춤 추천을 시작할 수 있어요.`
- No saved opportunities: `저장한 공고가 아직 없습니다.`
- No tasks: `분석 결과를 저장하면 마감 태스크가 생성됩니다.`
- Analysis error: `분석 중 문제가 발생했습니다. 본문을 다시 확인해주세요.`

Loading state:

- Button text changes to `분석 중`
- Cards may use subtle skeleton rows

## 12. Responsive Behavior

### Tablet

- Sidebar may collapse to icons
- Main grid becomes single column or two stacked zones
- Profile summary moves below hero card

### Mobile

- Top bar becomes two rows
- Search expands full width
- Sidebar becomes bottom nav or drawer
- Opportunity cards become one-column list
- Form inputs stack vertically

Avoid horizontal overflow. Long URLs and notice titles must wrap.

## 13. Accessibility

- Every icon-only action needs an accessible label.
- Buttons use visible focus states.
- Category chips must not rely only on color; include text.
- Form labels are always visible.
- Contrast should meet WCAG AA for body text.

## 14. Copy Style

Tone: concise, helpful, student-friendly.

Use:

- `분석하기`
- `저장`
- `전체 보기`
- `지원 가능`
- `조건부 가능`
- `정보 부족`
- `제출 전 최종 확인`

Avoid:

- Overly technical model/API wording in the main UI
- Long explanations inside cards
- Marketing slogans in dashboard space

## 15. Implementation Notes

Recommended file organization:

```text
src/
  components/
    ProfileForm.jsx
    OpportunityInput.jsx
    MatchResultCard.jsx
    SavedOpportunities.jsx
    TaskList.jsx
  data/
    sampleOpportunities.js
  services/
    analyzeOpportunity.js
    mockAnalyzeOpportunity.js
    createTasks.js
  storage/
    localStorageStore.js
```

Mock mode must remain the default until the backend/provider switch is intentionally changed. The visible UI should always include:

`현재는 mock 분석 모드이며 실제 OpenAI API를 호출하지 않습니다.`

## 16. Do Not Do

- Do not expose API keys in frontend code.
- Do not create a marketing landing page as the first screen.
- Do not hide the mock mode state.
- Do not use decorative blobs or unrelated illustrations.
- Do not make the dashboard dominated by one hue only; use category accents for scanability.
- Do not make nested cards inside cards.

