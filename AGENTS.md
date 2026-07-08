# Repository Instructions

## Project

This repository is a frontend MVP for a Korean university festival guide website.

The product goal is to help festival visitors quickly find the information they need on-site:

- What is happening now or next
- Which booths are operating
- Where booths are located
- Booth menus and prices
- Important festival notices

The MVP is intentionally frontend-only. Do not add backend services, authentication, authorization, admin CRUD, or booth-owner management unless the user explicitly changes the scope.

## Source Of Truth

Read these documents before changing product behavior or UI:

- `docs/plan/v1.0.0.md`: product scope, users, MVP features, and flows
- `docs/design/DESIGN.md`: visual system, layout rules, typography, colors, and component guidance
- `design-qa.md`: latest Product Design QA notes, when present

If implementation and documentation disagree, prefer the documents and update code accordingly. If the intended behavior is still ambiguous, make the smallest reasonable assumption and mention it in the final response.

## Product Scope

In scope for the current MVP:

- Home screen
- Timetable screen
- Booth list screen
- Booth detail screen
- Notice list screen
- Notice detail screen
- Static or mock data
- Mobile-first responsive UI

Out of scope unless explicitly requested:

- Backend APIs
- Login or user accounts
- Admin dashboard
- Operator CRUD
- Real-time data sync
- Payment, ordering, reservations, or favorites

## Design Rules

Follow `docs/design/DESIGN.md`.

Critical rules:

- Keep the home screen simple. It should not become a dense dashboard.
- Show one primary judgment on the home screen: today status and the next important action.
- Use white as the base surface, near-black text, and green as the primary accent.
- Use blue only for booth-related accents and orange only for notices or warnings.
- Avoid purple gradients, beige/tan themes, decorative blobs, heavy shadows, nested cards, and poster-like layouts.
- Mobile readability matters more than decorative festival atmosphere.
- Body text should generally stay at 14px or larger.
- Touch targets should be at least 44px high.
- Use spacing, grouping, typography, and dividers before adding borders or shadows.
- Keep radius at 8px or less unless there is a specific documented reason.

## UI And Interaction Expectations

Controls shown in the UI should work.

Expected prototype interactions:

- Bottom navigation changes sections.
- Timetable date and category filters update the schedule list.
- Booth date, category, and search controls update the booth list.
- Booth rows open a detail view.
- Notice rows open a detail view.
- Back buttons return from detail views.

Do not leave visible controls as static decoration.

## Code Style

- Use React and TypeScript.
- Keep implementation close to the existing Vite app structure.
- Prefer simple component boundaries over premature abstractions.
- Keep mock data structured and typed.
- Use `lucide-react` for line icons.
- Do not introduce a routing library, state manager, UI framework, or CSS framework unless the feature genuinely needs it.
- Prefer CSS variables from `src/index.css` for colors, spacing, and radii.
- Keep comments sparse. Add comments only where the code would otherwise be difficult to follow.

## Frontend Directory Structure

- `src/App.tsx`: app composition, top-level screen state, and navigation wiring only.
- `src/components/`: reusable UI components that are not tied to one screen.
- `src/screens/`: screen-level components for home, timetable, booths, and notices.
- `src/data/`: static MVP mock data and navigation metadata.
- `src/types/`: domain and UI TypeScript types.
- `src/utils/`: pure filtering or formatting helpers.
- `src/styles/`: app-level CSS. Keep design tokens in `src/index.css`.

When adding code, put it in the narrowest folder that owns the responsibility. Do not grow `App.tsx` with screen markup or mock data.

## Data Rules

Until real festival data is provided:

- Use realistic Korean mock data.
- Keep dates, categories, locations, menu names, and prices consistent across screens.
- Do not invent backend-like persistence.
- Do not fetch external data without a clear user request.

## Accessibility

Maintain baseline accessibility:

- Use semantic headings and landmarks.
- Buttons must be actual `button` elements.
- Icon-only controls need accessible labels.
- Do not rely on color alone to communicate status.
- Preserve visible focus styles.
- Check mobile viewport behavior at 390px width.

## Verification

Before claiming completion, run:

```bash
pnpm lint
pnpm build
```

If the shell cannot find `node`, use the Codex bundled runtime paths:

```powershell
$env:PATH='C:\Users\firej\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\firej\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
pnpm lint
pnpm build
```

For UI work, also verify the local app in a browser at a mobile viewport, preferably 390 x 844. If visual QA is performed, update `design-qa.md` with the viewport, state, screenshot path, findings, and final result.

## Git And Generated Files

- Do not commit generated build output such as `dist/`.
- Do not commit local screenshots or QA capture folders such as `.codex-screenshots/`.
- Do not commit local QA reports such as `design-qa.md` unless the user explicitly asks.
- Do not revert user changes unless the user explicitly asks.
- Keep changes scoped to the requested task.

## Final Response Expectations

When reporting work:

- Mention the main files changed.
- Include verification commands and their result.
- Mention any known limitation or follow-up if relevant.
- Keep the response concise and practical.
