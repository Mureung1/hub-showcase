# DevChat Screen Spec

## Product Name

- Desktop app name: `ICU`
- Full meaning: `I CODE U`
- Use `ICU` in app chrome, title bars, onboarding, and user-facing copy.
- Keep `DevChat` only as the repository/planning name until a full rename is scheduled.

## Global Shell

### Left Navigation

Items:

- Today
- Learning List
- Review
- Settings

Behavior:

- Current item uses teal active indicator.
- Labels remain visible on desktop.
- Icons can be used later, but text labels should not be removed for MVP accessibility.

## Today Learning Hub

### Header

Content:

- Page title: `오늘 학습`
- Date
- Short status: `오늘 1개 학습, 2개 복습 예정`

Actions:

- Search or command input
- Settings

### Today's Focus

Fields:

- Active track: `React 입문`
- Current step: `state와 이벤트`
- Mission: `Counter 컴포넌트 실습`
- Estimated time: `35분`
- Progress: `3 / 5 단계`

Actions:

- Primary: `이어서 학습하기`
- Secondary: `계획 조정`

States:

- No active learning: show prompt to create a learning goal.
- Learning paused: show resume point and last activity.
- All done today: show review summary and next schedule.

### Today Queue

Rows:

- Concept explanation
- Quick quiz
- Code mission
- Test execution
- AI code review

Each row should show:

- Step state: done, current, locked, optional
- Short title
- Estimated duration

### Learning List Preview

Rows:

- React
- Python
- FastAPI
- BFS

Each row should show:

- Track name
- Status
- Progress
- Last studied date
- Next action

Status labels:

- `진행 중`
- `복습 필요`
- `완료`
- `시작 전`

### Review and Mistakes Summary

Content:

- Review due count
- Weak concepts
- Recent wrong answers
- Next review date

Action:

- `오늘 복습 시작`

## Learning Workspace IDE

### Top Bar

Content:

- Current track
- Current step number
- Today progress
- Estimated remaining time

Actions:

- `학습 목록`
- `오늘 학습`
- Settings

### Curriculum Panel

Content:

- Today curriculum steps
- Current mission
- Pass criteria
- Review due shortcut

Step states:

- Completed
- Current
- Upcoming
- Blocked or needs retry

### AI Tutor Panel

Content blocks:

- Explanation
- Mission
- Hint
- Code review
- Official sources

Rules:

- Keep long text narrow enough to read.
- Official sources should be visible but not dominate the conversation.
- When confidence is low, show uncertainty instead of a definitive answer.

### Code Editor Panel

Content:

- File tab
- Language selector
- Run button
- Monaco editor area
- Starter code

Primary action:

- `실행`

Secondary actions:

- `코드 인용`
- `초기 코드 복원`

### Test Results Panel

States:

- Not run
- Running
- Passed
- Failed
- Timeout

Failed state should include:

- Failed test name or number
- Plain-language reason
- Hint action
- Re-run action

Passed state should include:

- Passed count
- Short feedback
- Code review action
- Next step action

## Theme Notes

- Support light mode and dark mode from the first product UI implementation.
- The Figma `색감` layer should guide brand accents: warm orange, soft pink, bright cyan, and deep blue.
- Dense workspace panels should stay calm and readable; do not use large gradients behind editor or text-heavy panels.
- Dark mode should use navy/charcoal surfaces, high-contrast text, and the same semantic status labels as light mode.

## Accessibility Notes

- Use readable contrast for teal text on light surfaces.
- Keep primary buttons at least 44px tall where possible.
- Do not rely on color alone for progress states.
- Use explicit labels like `복습 필요`, `진행 중`, and `실패`.
- Preserve keyboard focus states on all interactive controls.

