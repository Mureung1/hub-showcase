# DevChat Design Brief

## Product

DevChat is an AI coding tutor desktop app for beginner and intermediate developers. It helps users decide what to learn today, follow a curriculum, practice in a code editor, run code, receive feedback, and keep a review history.

## Selected Direction

Use a combination of:

- Today Learning Hub: the first screen for managing today's study.
- Learning Workspace IDE: the active study screen with AI tutor, curriculum, editor, and test results.

The app should feel like a practical IDE tool, but it should be easier to enter than VS Code for beginners.

## Primary User Problem

Users do not only need more learning material. They need a clear learning flow:

- what to study today
- what to resume
- what to review
- what code to write now
- what failed and what to do next

## Product Principles

- Today first: the first screen should answer "what should I do now?"
- Learning before files: curriculum, missions, and review are more important than a traditional file explorer.
- IDE when needed: the code editor becomes central only after a session starts.
- Clear current step: every screen should make the current learning step obvious.
- Trust through sources: AI explanations should show official documentation references when available.
- Beginner-safe density: keep the tool efficient, but avoid overwhelming panels and unclear labels.

## Visual Direction

- Base: light neutral app surface.
- Surfaces: white or very light gray grouped panels.
- Accent: teal for progress, active state, and primary action.
- Editor: dark code area inspired by VS Code.
- Radius: 8px or less.
- Typography: Inter or system sans for UI, monospace for code.
- Avoid: decorative hero layouts, gradients, nested cards, oversized marketing sections, and purely ornamental images.

## Key Screens

1. Today Learning Hub
2. Learning List
3. Learning Workspace IDE
4. Review and Mistakes

For the first design pass, focus on screens 1 and 3.

## Default Scenario

The default design state should use this scenario:

- User goal: "React를 처음 배우고 싶어요."
- Active track: React
- Current mission: Counter component practice
- Current step: state and event handling
- Editor file: Counter.jsx
- Result state: runnable mission with visible test feedback

