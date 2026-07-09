# NoticePilot Design Rules

## Purpose

NoticePilot is a productivity tool for turning long university notices into
actionable checklists, source-backed review items, and calendar export
candidates. The interface should preserve the current calm, structured, and
trust-oriented tone.

These rules exist to keep future UI changes aligned with the existing product
feel instead of drifting into a generic AI assistant, marketing site, or
decorative dashboard.

## How To Use This Document

Use this document before adding or changing visible UI. If a proposed change
conflicts with these rules, preserve the current product tone unless a new plan
explicitly changes the design direction.

For implementation work, check the relevant detailed section first, then use
the Do / Don't lists as the practical review checklist.

## Design Direction

NoticePilot should feel:

- Clear before clever
- Practical before promotional
- Trustworthy before automated
- Reviewable before final
- Lightweight before feature-heavy

The product should not look or sound like it is replacing user judgment. It
should help users inspect, edit, and export structured information from notices.

## Product Tone

Use direct, calm language. Emphasize what the user can review, edit, confirm,
and export. Avoid overpromising AI accuracy or implying that extracted results
are final without user review.

Current tone anchors:

- Long notices become structured action items.
- Users review extracted results before trusting them.
- Source evidence matters.
- Manual paste remains a first-class path.
- Export happens after review.

## Visual Principles

Keep the visual system restrained and utility-focused.

- Use white panels over soft blue-gray page backgrounds.
- Use thin borders to separate areas instead of heavy shadows.
- Keep radius small and consistent.
- Use blue as the primary action and information color.
- Use muted slate text for secondary explanations.
- Reserve warm warning colors for review-blocking or cautionary states.
- Avoid decorative illustrations, loud gradients, and ornamental effects unless
  a later product direction explicitly changes the visual language.

## Layout Principles

Preserve the current reading and working flow:

```text
intro context
-> notice input
-> analysis result
-> user review/edit
-> source evidence
-> export
```

The workspace should remain task-oriented. Primary work belongs in the main
column. Supporting review and export controls belong in the side panel when
screen width allows.

## Component Principles

Prefer reusable patterns already present in the app:

- section headings with eyebrow labels
- bordered panels for major areas
- compact editable cards for extracted items
- pills for item type and edited state
- primary buttons for the main action
- ghost buttons for secondary actions
- inline checkboxes for selection or completion
- warning and error blocks for states that need attention

New components should make the current workflow easier to inspect, not introduce
unrelated navigation or hidden state.

## Copy Principles

Keep copy bilingual-ready and concise. English and Korean text should carry the
same intent, even if phrasing differs naturally.

Good copy should:

- name the user action clearly
- explain review or export consequences when needed
- distinguish mock behavior from real AI behavior
- avoid vague claims like "smart", "seamless", or "instant" when the app is
  asking for user verification

## Interaction Principles

Every extracted result should remain editable or reviewable when possible.
Important state changes should be visible, reversible, or confirmed.

Preserve these interaction expectations:

- manual text paste must keep working
- uploaded text must be shown before analysis
- analysis replacement requires confirmation
- privacy-like patterns require confirmation
- extracted items can be edited or removed
- source evidence can be inspected
- export depends on reviewed current state

## Baseline Guardrails

Every future design pass should preserve the current MVP workflow and usability
baseline.

Baseline expectations:

- Keep manual text paste usable.
- Preserve English and Korean UI support.
- Keep extracted results reviewable and editable.
- Keep source evidence visible and easy to reach.
- Keep exports tied to the reviewed current state.
- Maintain readable contrast and semantic controls.
- Let layouts collapse cleanly on small screens without clipping Korean text.

## Brand Tone

NoticePilot should sound like a careful student productivity assistant, not a
generic AI chatbot. The brand voice should be calm, precise, and modest about
automation.

Use the product name to anchor the tool, then quickly move to the user's task:
turning a notice into things to review, edit, and export. Avoid making the brand
feel larger than the workflow.

Do:

- Say what the tool helps the user inspect or produce.
- Keep claims tied to current capabilities.
- Use a calm, instructional voice for risk, privacy, and export copy.

Don't:

- Present AI output as inherently correct.
- Use hype-heavy language or broad productivity promises.
- Turn the page into a brand campaign when the user needs a working tool.

## Layout

Use layouts that make the workflow easy to scan from top to bottom. Introductory
sections can explain the product, but the workspace should prioritize the active
task.

Major layout rules:

- Keep the intro and workspace visually separate.
- Keep input and analysis results in the main column.
- Keep source evidence and export controls in supporting panels.
- Prefer grid layouts with clear gaps over dense nested cards.
- Collapse multi-column layouts to a single column on narrow screens.
- Do not add navigation that competes with the notice review workflow.

Do:

- Keep new workflow controls close to the section they affect.
- Preserve the main-column and side-panel split on desktop.
- Let the document read in the same order that the user works.

Don't:

- Put export controls before review controls.
- Hide primary actions inside menus when space is available.
- Create nested card stacks that make the workspace feel heavier.

## Color

The color system should remain quiet and functional.

Core color roles:

- Primary blue: main actions, active states, brand mark, and evidence accents.
- Slate text: headings, body copy, labels, and secondary descriptions.
- Soft blue backgrounds: information callouts, extract preview, and calm
  emphasis.
- Yellow warning: non-blocking issues the user should review.
- Red error: blocked actions or failed operations.
- Green edited state: explicit confirmation that a user changed extracted data.

Current color tokens:

| Role | Token | Usage |
| --- | --- | --- |
| Page text | `#172033` | Default app text and form text |
| Heading text | `#0f172a` | Major headings and high-emphasis titles |
| Body text | `#475569` | Paragraphs and supporting content |
| Muted text | `#64748b` | Secondary labels, subtitles, and quiet helper copy |
| Secondary text | `#334155` | Chip text, ghost buttons, and compact content |
| Page background | `#f5f7fb` | Root background and intro gradient end |
| Workspace background | `#eef2f8` | Workspace band |
| Panel background | `#ffffff` | Cards, panels, modal, and primary surfaces |
| Subtle background | `#f8fafc` | Inputs, chips, item cards, nested review blocks |
| Primary blue | `#1d4ed8` | Brand mark, active language toggle, primary button |
| Focus blue | `#2563eb` | Input focus border and evidence accent border |
| Strong blue text | `#1e3a8a` | Informational callout text and header CTA text |
| Pill blue text | `#1e40af` | Type pill text |
| Info background | `#eff6ff` | Extract preview, privacy notice, callout, flow item |
| Info border | `#bfdbfe` | Informational callout borders |
| Standard border | `#dfe5ef` | Panels, cards, workspace divider |
| Control border | `#cbd5e1` | Inputs, toggles, ghost buttons, header CTA |
| Soft border | `#d7deea` | Chips |
| Warning background | `#fffbeb` | Warning banner |
| Warning border | `#fde68a` | Warning banner border |
| Warning text | `#92400e` | Warning banner text |
| Error background | `#fef2f2` | Error message |
| Error border | `#fecaca` | Error message border |
| Error text | `#991b1b` | Error message text |
| Edited background | `#dcfce7` | Edited pill |
| Edited text | `#166534` | Edited pill text |
| Overlay | `rgba(15, 23, 42, 0.42)` | Modal backdrop |
| Header surface | `rgba(255, 255, 255, 0.92)` | Sticky header background |
| Focus ring | `rgba(37, 99, 235, 0.14)` | Input focus shadow |
| Modal shadow | `rgba(15, 23, 42, 0.22)` | Confirmation modal shadow |

Avoid adding new saturated colors unless they represent a distinct state that
cannot be expressed by the existing system.

Do:

- Reuse existing blue, slate, yellow, red, and green roles.
- Keep panels mostly white with subtle borders.
- Use state colors consistently across cards, banners, and buttons.

Don't:

- Add decorative gradients or unrelated accent colors.
- Use warning or error colors for ordinary emphasis.
- Make color the only indicator of selected, edited, warning, or error state.

## Typography

Typography should feel clear and utilitarian. The current system font stack is
appropriate for both English and Korean UI.

Use large type sparingly. The hero can carry a strong headline, but workspace
headings, labels, cards, and panels should stay compact and scannable.

Typography rules:

- Use strong weight for labels, buttons, and category markers.
- Use muted body text for explanation, not for primary data.
- Keep eyebrow labels short, uppercase in English, and visually secondary to
  headings.
- Do not use decorative fonts or letter spacing that hurts Korean readability.

Do:

- Keep workspace labels and controls compact.
- Let Korean text wrap instead of forcing narrow fixed widths.
- Use hierarchy through size, weight, spacing, and placement.

Don't:

- Add decorative font families.
- Use oversized headings inside cards or side panels.
- Rely on tight letter spacing for emphasis.

## Components

Components should reinforce review and editing. Prefer existing patterns before
adding new ones.

Core component roles:

- Panel: major working area or sidebar tool.
- Editable item card: extracted data that can be reviewed, changed, or removed.
- Pill: compact metadata such as item type or edited state.
- Primary button: the main next action in a section.
- Ghost button: secondary or optional action.
- Inline checkbox: completion, selection, or inclusion state.
- Warning banner: review-needed state.
- Error message: blocked or failed state.
- Confirmation modal: explicit user consent before replacing or continuing with
  sensitive content.

New components should not hide source evidence, editing controls, or export
consequences behind ambiguous UI.

Do:

- Start from existing `tool-panel`, `dashboard`, `side-panel`, and `item-card`
  patterns.
- Keep item-level actions visible on editable extracted items.
- Use existing button styles unless a new action hierarchy is clearly needed.

Don't:

- Add a new card style for a use case that fits an existing panel or item card.
- Remove evidence access from extracted results.
- Add custom controls where native inputs, checkboxes, or buttons are enough.

## States And Feedback

State feedback should be visible near the action it affects.

Use feedback to answer these questions:

- Is this result from a mock or server mock flow?
- Does the user need to review a warning?
- Was an extracted item edited?
- Is an export currently blocked?
- Does the current action replace existing work?
- Is possible sensitive information present?

Avoid silent state changes for actions that modify analysis results, calendar
selection, exports, or stored notice text.

Do:

- Show warnings before the user continues with risky input.
- Confirm replacement of an existing analysis result.
- Keep loading and disabled states specific to the action in progress.
- Mark edited extracted items visibly.

Don't:

- Fail silently when export is blocked.
- Clear user-entered notice text without explicit action.
- Mix privacy warnings, validation warnings, and server errors into one generic
  message.

## Microcopy

Microcopy should reduce uncertainty. Favor concrete labels over broad product
claims.

Use language that tells the user what will happen:

- "Review before analysis"
- "Source evidence"
- "Select for calendar export"
- "Replace current analysis?"
- "Include evidence in Markdown"

Keep mock and real behavior distinct. If a feature is mock-only, label it as
mock. If real AI is not implemented, do not imply that it is available.

Do:

- Use verbs that match the actual action: analyze, review, replace, select,
  download, include.
- Mention consequences when an action changes or discards current work.
- Keep Korean and English copy equivalent in meaning.

Don't:

- Use vague labels like "Continue" when the consequence is replacement.
- Describe mock analysis as real AI analysis.
- Add long instructional paragraphs for controls that are already familiar.

## Responsive Behavior

Responsive behavior should preserve the workflow order. On small screens, the
main task should appear before supporting export or evidence panels.

Responsive rules:

- Stack workspace columns into one column.
- Keep controls visible without horizontal scrolling.
- Let long Korean labels wrap naturally.
- Keep card actions usable when they move from right-aligned to left-aligned.
- Avoid fixed heights for content that can expand after translation or editing.

Do:

- Test layouts with long Korean labels and edited item text.
- Keep buttons and inputs large enough to tap comfortably.
- Preserve the order: input, result, evidence, export.

Don't:

- Require horizontal scrolling for cards, panels, or forms.
- Keep sticky sidebars on narrow screens.
- Clip badges, labels, or action buttons to preserve a fixed row height.

## Accessibility

Accessibility is part of the product's trust posture. The app handles important
deadlines, requirements, and export decisions, so controls must remain clear and
operable.

Accessibility rules:

- Use semantic sections, headings, labels, and buttons.
- Keep visible focus treatment for inputs and controls.
- Use status and alert roles for warnings and errors when appropriate.
- Preserve readable contrast for text, borders, and state colors.
- Do not rely on color alone to communicate warning, error, edited, or selected
  states.
- Ensure modals communicate their title, message, and available actions clearly.

Do:

- Pair state color with text labels, roles, or visible controls.
- Keep form labels connected to their inputs.
- Make confirmation choices explicit and keyboard reachable.

Don't:

- Replace semantic buttons with clickable non-button elements.
- Remove focus outlines without providing an equally visible replacement.
- Use placeholder text as the only label for an input.
