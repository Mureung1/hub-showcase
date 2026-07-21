# PtoP Landing and GitHub Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished PtoP landing page, connect it naturally to the existing repository analyzer, and provide a GitHub OAuth header action using Supabase Auth.

**Architecture:** Keep the existing single-page React/Vite app. `App` composes a landing section, an auth action, and the existing analyzer section; authentication state lives in a small Supabase hook and does not block anonymous repository analysis. A replaceable local demo preview asset is used instead of a real GIF.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS, CSS modules via the existing global stylesheet, npm workspaces.

## Global Constraints

- Follow `docs/design/design-system.md` for PtoP colors, spacing, motion, focus states, and reduced-motion behavior.
- Keep repository analysis available without login; login is an entry point for future reflection persistence.
- Do not expose Supabase secret or service-role keys in `apps/web`.
- Do not modify `.github/` or GitHub Actions workflows.
- Do not commit or push during this implementation session.

### Task 1: Add the navigation logo asset

**Files:**
- Create: `apps/web/public/assets/PtoP_NavLogo.png` from the user-provided `/Users/sub_j/Desktop/PtoP_NavLogo.png`

- [ ] Copy the supplied navigation logo into the public asset directory and verify it is readable by Vite.
- [ ] Keep the existing hero logo asset unchanged; the navigation logo has its own size treatment.

### Task 2: Add Supabase client and GitHub auth state

**Files:**
- Create: `apps/web/src/lib/supabase.ts`
- Create: `apps/web/src/features/auth/useAuth.ts`
- Create: `apps/web/src/features/auth/AuthButton.tsx`
- Modify: `apps/web/src/vite-env.d.ts`
- Modify: `apps/web/.env.example`

**Interfaces:**
- `useAuth()` returns `{ session, user, isLoading, error, signInWithGitHub, signOut }`.
- `AuthButton` renders login, loading, authenticated, and error states without blocking the rest of the page.

- [ ] Create a browser Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Subscribe to `onAuthStateChange`, load the initial session, and clean up the subscription.
- [ ] Implement `signInWithOAuth({ provider: "github", options: { redirectTo: window.location.origin + "/hub/" } })` and `signOut()`.
- [ ] Add Vite environment typings and a safe `.env.example` containing names only.
- [ ] Render the authenticated GitHub identity and a logout action in the header.

### Task 3: Compose the landing flow

**Files:**
- Create: `apps/web/src/components/SiteHeader.tsx`
- Create: `apps/web/src/components/LandingHero.tsx`
- Create: `apps/web/src/components/DemoPreview.tsx`
- Create: `apps/web/src/components/WorkflowSection.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] Add a compact header with the supplied navigation logo, anchor links, and `AuthButton`.
- [ ] Add hero copy and a primary CTA that scrolls to the analyzer section.
- [ ] Add a replaceable demo preview with an explicit placeholder path and no fake analysis result.
- [ ] Add a short workflow section describing repository input, analysis, and result review.
- [ ] Keep the existing `RepositoryAnalyzer` and supporting sections below the landing content.

### Task 4: Apply responsive visual design and motion

**Files:**
- Modify: `apps/web/src/style.css`

- [ ] Add header, hero, preview, workflow, and CTA styles using existing PtoP tokens.
- [ ] Use soft borders, mint accents, restrained shadows, and no heavy black section borders.
- [ ] Add hover, focus-visible, loading, and reduced-motion states.
- [ ] Ensure mobile widths keep the logo, login action, repository input, and CTA usable without horizontal overflow.

### Task 5: Verify the feature

**Files:**
- Modify: `apps/web/src/features/auth/useAuth.test.ts` if a pure helper test is needed.
- Modify: `apps/web/src/features/auth/AuthButton.test.tsx` if the existing test setup supports component tests.

- [ ] Run `npm run typecheck:web`.
- [ ] Run `npm run test:web`.
- [ ] Run `npm run build:web`.
- [ ] Start the web app and verify landing-to-analyzer anchor navigation at desktop and mobile widths.
- [ ] Verify GitHub login calls Supabase OAuth and that missing provider configuration shows a readable error.
- [ ] Confirm no secret key is referenced by web source or bundled output.
