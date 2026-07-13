# Project Guidance

## Project

This repository implements a mobile-first web service for local-clinic remote waiting. Patients join the clinic's real walk-in queue before arrival, while clinic staff manage remote and on-site entries in one queue.

Read these files before changing behavior:

- Product plan: `docs/plan.md`
- System rules: `docs/feature-spec.md`
- Data model: `docs/erd.md`
- UX structure: `docs/ux-structure.md`
- Design system: `docs/design-system.md`
- Development checklist: `docs/checklist.md`

If these documents conflict, use `docs/plan.md` for product scope, `docs/feature-spec.md` for behavior, and `docs/erd.md` for persisted data. Ask before changing product scope.

## Stack

- `react/`: React 19 + Vite, JavaScript/JSX, `react-router-dom`, `lucide-react`
- `server/`: Node.js + Express + TypeScript, ESM, `tsx` for development
- `prototype/`: static HTML and CSS only; do not add JavaScript or external CDNs

The frontend and server have separate `package.json` files. Do not introduce npm workspaces without agreement.

## Commands

Run commands from the relevant app directory.

```text
react:  npm install | npm run dev | npm run lint | npm run build
server: npm install | npm run dev | npm run typecheck | npm run build
```

Default development ports are `5173` for Vite and `3000` for Express.

## MVP Rules

- Prioritize the P0 flow in `docs/checklist.md` before P1 or P2 work.
- Treat one family as one waiting entry with child, adult, and senior counts.
- Calculate queue load from the number of patients, not the number of family entries.
- Keep remote and on-site entries in the same real treatment queue.
- Require a patient account and login for remote waiting. Allow staff-created on-site waiting without a patient account.
- Allow at most one active remote waiting per patient account across all clinics.
- Supported states are `remote_waiting`, `entry_requested`, `onsite_waiting`, `held`, `called`, and `cancelled`.
- Treat deferring as a queue-order action recorded separately from no-show movement, not as a persistent status.
- Send mock preparation notification at position 6 and mock entry request at position 4. Start the 20-minute arrival deadline only for the entry request.
- Let clinic staff confirm a remote patient's arrival and desk registration. Do not add a patient arrival-code flow.
- On-site patients use an opaque status link without direct defer or cancel actions; invalidate it immediately on call or cancellation.
- Limit remote capacity to 20 patients by default and never apply that limit to staff-created on-site entries.
- `called` means the entry left the waiting queue; this project does not manage medical treatment details.
- Estimated time is advisory and must be shown with a notice that clinic conditions can change it.
- Staff may reorder entries for medical operations without exposing the reason to other patients.
- MVP Alimtalk, clinic verification, evidence upload, approval, and nearby results are mocked. Real providers and clinic-system integrations are P2.

## Engineering Conventions

- Use the existing folder boundaries: routes, services, repositories, types, middleware, pages, components, hooks, and utils.
- Keep queue calculations and state-transition rules out of React page components.
- Use the existing fetch wrapper instead of adding Axios.
- Use explicit TypeScript types in the server; do not use `any` or guess missing domain fields.
- Keep patient-facing identifiers opaque. Do not collect patient names, birth dates, or symptoms in MVP, and never expose phone numbers in public queue views.
- Preserve user changes and avoid unrelated refactors.
- Commit prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## UI Work

- Use the repo skill `build-clinic-ui` for UI creation, styling, responsive work, or visual QA.
- Treat `docs/design-system.md` as the visual rulebook and `react/src/styles/design-tokens.css` as the canonical code export.
- Inspect the matching file in `docs/assets/design/` before implementing patient registration, patient status, or staff queue screens.
- Patient screens are mobile-first and optimized for one-handed use.
- Staff queue screens prioritize fast scanning and repeated actions.
- Never communicate queue state by color alone; pair text with an icon or status marker.
- Use one primary action per view and keep touch targets at least 44px.
- Use existing `--bj-*` tokens before adding raw colors, spacing, radii, or shadows. Add new tokens only in the canonical token file.
- Keep the default radius at 6px and never exceed 8px except for status pills.
- Do not reuse PlaceSync-specific labels, sample data, screens, or platform concepts.

## Verification

- Run the narrowest relevant checks after each change.
- For frontend changes, run `npm run lint` and `npm run build` in `react/`.
- For server changes, run `npm run typecheck` and `npm run build` in `server/`.
- For end-to-end queue work, verify two browser sessions: one patient view and one staff view.
- Do not report completion while required checks are failing.
