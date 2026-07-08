# DevChat Figma Handoff

## Frame Setup

Create desktop frames at:

- `1440 x 1024` for Today Learning Hub
- `1440 x 1024` for Learning Workspace IDE

Optional later frames:

- Learning List
- Review and Mistakes
- Empty Today state
- Failed test state
- Passed test state

## Frames to Create First

### 1. Today Learning Hub

Use image reference:

- `docs/design/images/concept-01-today-learning-hub.png`

Frame sections:

- Left navigation rail
- Header
- Today's focus
- Today queue
- Learning list preview
- Review and mistakes summary
- Small workspace preview

### 2. Learning Workspace IDE

Use image reference:

- `docs/design/images/concept-03-learning-workspace-ide.png`

Frame sections:

- Top bar
- Curriculum panel
- AI tutor panel
- Code editor panel
- Test results panel

## Naming

- User-facing desktop app name: `ICU`
- Meaning: `I CODE U`
- Repository/planning name can remain `DevChat` until a broader rename is scheduled.

## Design Tokens

Suggested tokens based on the current React project:

```text
font.ui: Inter, system-ui, sans-serif
font.code: SFMono-Regular, Consolas, monospace

color.light.bg: #f4f6f8
color.light.surface: #ffffff
color.light.surfaceSubtle: #fbfcfe
color.light.text: #172033
color.light.textStrong: #101828
color.light.textMuted: #64748b
color.light.border: #d3dce8

color.dark.bg: #07111f
color.dark.surface: #0f1b2d
color.dark.surfaceSubtle: #13243a
color.dark.text: #e5edf7
color.dark.textStrong: #f8fafc
color.dark.textMuted: #94a3b8
color.dark.border: #25364d

color.brand.orange: #ff8a1c
color.brand.pink: #f3b8d8
color.brand.cyan: #35c8f4
color.brand.blue: #0b4bb3
color.brand.navy: #112b5f

color.accent: #0b4bb3
color.accentBright: #35c8f4
color.editorBg: #151a24
color.editorText: #dbe4ef

radius.sm: 6
radius.md: 8
```

## Component Candidates

- App shell
- Navigation rail item
- Status pill
- Progress row
- Learning track row
- Curriculum step item
- Tutor message
- Source reference row
- Editor toolbar
- Test result strip
- Primary button
- Secondary button

## Interaction Notes

For the first Figma pass, keep the design mostly static but represent these states:

- active navigation item
- current curriculum step
- selected learning track
- failed test result
- primary continue/run action

Later prototype interactions:

- `이어서 학습하기` opens workspace.
- `학습 목록` returns to list view.
- `실행` changes result panel from running to passed/failed.
- `힌트 보기` expands hint block in AI tutor panel.


## Theme Notes

- Keep the Workday-like color mood as brand atmosphere, not as the dominant workspace background.
- Use cyan and deep blue for primary actions, focus rings, progress, and selected states.
- Use warm orange sparingly for highlights, completion, or friendly onboarding moments.
- Dark mode must preserve code readability and should use navy/charcoal surfaces instead of pure black.
