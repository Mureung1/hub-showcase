---
name: default-design-rule
description: 대학생 어학시험 학습 계획 서비스의 새로운 화면이나 컴포넌트를 제작하거나 디자인을 검토할 때 사용하는 디자인 Skill입니다. docs/plan.md와 docs/design.md를 기준으로 일관된 UI를 제작해야 할 때 사용합니다.
argument-hint: "[만들 화면 또는 검토할 컴포넌트]"
user-invocable: true
---

# default-design-rule

Use this skill when creating or reviewing a new screen or component for the university English test study planner service.

## Goal
Keep the interface consistent with the project direction in docs/plan.md and docs/design.md, while avoiding unnecessary decoration and preserving clear information hierarchy.

## Workflow
1. Read the workspace-root docs/plan.md and docs/design.md before making changes.
2. Identify the purpose of the screen or component and the core user action it supports.
3. Apply the design tokens and rules from docs/design.md for color, typography, spacing, and borders.
4. Use the same visual treatment for parallel items at the same level of importance.
5. Show selection state only on the selected item.
6. Use pastel blue for primary UI emphasis and selection states.
7. Use light pink only for section division and secondary status cues.
8. Emphasize important information with size, weight, and simple solid-color blocks rather than decorative effects.
9. Avoid meaningless decoration and excessive gradients.
10. Consider both desktop and mobile layouts.
11. After editing, review whether the result still follows docs/design.md.
12. Explain the changed files and the reason for each change.
13. Do not modify unrelated files.

## Source of truth
- Use docs/design.md as the main reference for design values.
- Keep the implementation aligned with the documented palette, spacing, typography, and interaction rules without duplicating long design details in this skill.

## Output expectations
- Make the UI visually consistent and easy to understand.
- Preserve a clear hierarchy of information.
- Keep the design calm, structured, and practical.
- Avoid unnecessary visual variation between similar items.
