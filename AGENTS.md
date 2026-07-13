# Repository Guidelines

## Project Structure & Module Organization

This is a small React + Vite application. The entry point is `src/main.jsx`, which mounts `src/App.jsx`. Reusable UI belongs in `src/components/`, such as `src/components/ProjectIntro.jsx`. Global styles live in `src/index.css`, while app-level styles live in `src/App.css`. Image and component-scoped assets can live in `src/assets/`; files that should be served unchanged, such as favicons or icon sprites, belong in `public/`.

There is no dedicated test directory yet. When tests are added, prefer colocating them beside the code they cover or adding a clear `src/__tests__/` directory if broader integration tests are introduced.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server with hot module replacement.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally for verification.
- `npm run lint`: run Oxlint against the codebase.

Run `npm run lint` and `npm run build` before opening a pull request.

## Coding Style & Naming Conventions

Use ES modules and React function components. Name components in PascalCase (`ProjectIntro.jsx`) and keep helper variables/functions in camelCase. Prefer single quotes and semicolons, matching the existing source. Use two-space indentation for JSX and JavaScript.

Keep components focused: `App.jsx` should compose page-level sections, while reusable or independently styled UI should move into `src/components/`. Keep CSS selectors readable and tied to component structure rather than deeply nested global rules.

Oxlint is configured in `.oxlintrc.json` with React rules enabled, including hooks validation and export guidance. Fix lint warnings when practical instead of suppressing them.

## Testing Guidelines

No test framework is configured at the moment. If adding tests, use a Vite-friendly setup such as Vitest with React Testing Library, and add a matching `test` script to `package.json`. Name tests after the unit under test, for example `ProjectIntro.test.jsx`. Cover rendering behavior, user-visible text, and any interaction logic.

## Commit & Pull Request Guidelines

Recent commits use short, focused summaries, with some history written in Korean. Keep commit subjects concise, imperative, and limited to one change.

Pull requests should include a clear work summary, any uncertain or hard-to-review areas, and screenshots for visible UI changes. Link related issues when available, and note whether `npm run lint` and `npm run build` passed.
