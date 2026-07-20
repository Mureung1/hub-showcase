---
name: xp-desktop-pet-ui
description: Use when designing, editing, reviewing, or generating assets for the Windows XP desktop electronic-pet quest manager UI in the AIAgentChallenge hub project. Trigger for XP desktop UI, Manager.exe, QuestRunner.exe, Lumi/electronic manager, pixel desktop backgrounds, XP windows/taskbar/icons, quest/recovery flow, or project asset prompts.
---

# XP Desktop Pet UI
> Repository copy for review and reuse. 실제 Codex 실행용 skill은 로컬 `.codex/skills/xp-desktop-pet-ui`에 설치해서 사용한다.

Use this skill to keep the electronic manager web app visually and behaviorally consistent.

## First Steps

1. Check the current project docs if available:
   - `docs/design-system.md`
   - `docs/mvp-functional-spec.md`
   - `docs/user-flow-wireframes.md`
2. Keep implementation, documentation, and future ideas separate.
3. Do not add unimplemented future modules to visible UI.

## Core Rules

- Build the app as a Windows XP desktop, not a landing page.
- Default visible shell: wallpaper, desktop icons, XP windows, taskbar.
- Default open windows after onboarding: today quest and manager only.
- Use compact beige XP windows with blue title bars and 1px bevels.
- Use real HTML/React text and controls. Do not bake UI text into images.
- Use pixel assets for wallpaper, desktop icons, manager sprite, rewards, and FX.
- Keep the currently implemented Lumi as an electronic lifeform, not a real animal.
- For the approved replacement-character exploration, use the pink animal same-size direction: animal-like cuteness is allowed, but Stage 1-4 must stay similar in size and viewpoint. Evolve through polish, ears, paws, cheek fur, paw pads, tail, or tiny accessories, not through larger/adult proportions or extra electronic decoration.
- Put Lumi dialogue only in the manager window bottom dialogue panel.
- Do not put Lumi dialogue in QuestRunner.exe, failure, or recovery windows.
- Use [RUN] in QuestRunner.exe; do not add a duplicate status row.
- Recovery edit closes the recovery window and opens only the quest window.
- Never show developer layer names such as Agent Layer, Reward Layer, Asset Pipeline in the app UI.

## References

Read only what the task needs:

- Visual tokens and CSS rules: `references/01-design-tokens.md`
- XP shell and windows: `references/02-xp-shell.md`
- Quest and manager behavior: `references/03-quest-manager-flow.md`
- Copy and dialogue rules: `references/04-copy-rules.md`
- Asset prompt structure: `references/asset-prompts/README.md`

## Verification

- Check for Korean mojibake before handoff; do not leave broken Korean text.
- Check that visible UI does not mention future-only features.
- For static HTML, asset paths must work from `file://`; prefer `./assets/...`.
- Follow the project rule: do not run build unless the user asks.



