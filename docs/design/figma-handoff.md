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

## Design Tokens

Suggested tokens based on the current React project:

```text
font.ui: Inter, system-ui, sans-serif
font.code: SFMono-Regular, Consolas, monospace

color.bg: #f4f6f8
color.surface: #ffffff
color.surfaceSubtle: #fbfcfe
color.text: #172033
color.textStrong: #101828
color.textMuted: #64748b
color.border: #d3dce8
color.accent: #0f766e
color.accentBright: #14b8a6
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

