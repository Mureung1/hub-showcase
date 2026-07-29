# PtoP Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing content below the existing video with a polished, scroll-driven PtoP story based on the standalone HTML reference while preserving the current header, video, and existing motion behavior.

**Architecture:** Keep `LandingHero` and `SiteHeader` unchanged. Replace the current monolithic `FigmaLandingContent` markup with focused section components for the introduction, workflow, evidence preview, workroom, and final CTA. Use the existing `ScrollReveal`, design tokens, and real project preview assets; clearly label illustrative analysis content as an example.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite, existing PtoP design tokens and local PNG/MP4 assets.

## Global Constraints

- Preserve the existing landing video and header navigation behavior.
- Use Pretendard and the existing PtoP color tokens.
- Do not present mock repository evidence as a live analysis result; label the evidence panel as an example.
- Use `onEnterWorkspace` for every primary “start analysis” action.
- Keep sections responsive at narrow mobile widths without horizontal overflow.
- Keep motion subtle, respect `prefers-reduced-motion`, and reuse existing `ScrollReveal` behavior.

---

### Task 1: Add and verify landing mascot assets

**Files:**
- Create: `apps/web/public/assets/mascot/Poppy_Hi_NOBG.png`
- Create: `apps/web/public/assets/mascot/Poppy_Insite_NOBG.png`

**Interfaces:**
- Produces two static public assets referenced by the landing components through `${import.meta.env.BASE_URL}`.

- [ ] **Step 1: Copy the two supplied PNG assets into the public mascot directory**

Run:

```bash
cp "/Users/sub_j/Desktop/AI Agent Naver/Project/Assets/Poppy_Hi_NOBG.png" apps/web/public/assets/mascot/Poppy_Hi_NOBG.png
cp "/Users/sub_j/Desktop/AI Agent Naver/Project/Assets/Poppy_Insite_NOBG.png" apps/web/public/assets/mascot/Poppy_Insite_NOBG.png
```

- [ ] **Step 2: Verify the assets are readable and retain transparency**

Run:

```bash
file apps/web/public/assets/mascot/Poppy_Hi_NOBG.png apps/web/public/assets/mascot/Poppy_Insite_NOBG.png
```

Expected: both files are PNG images with an RGBA/alpha channel.

---

### Task 2: Replace landing data with reference-driven content

**Files:**
- Modify: `apps/web/src/data/figmaLandingContent.ts`
- Test: `apps/web/src/data/figmaLandingContent.test.ts`

**Interfaces:**
- Produces typed content for the workflow cards, analysis highlights, workroom notes, and evidence example used by the landing sections.

- [ ] **Step 1: Extend the content types for evidence and workroom notes**

Add readonly types for:

```ts
export type LandingEvidenceExample = {
  readonly type: "PR" | "COMMIT" | "FILE" | "ISSUE";
  readonly reference: string;
  readonly title: string;
  readonly metadata: string;
};

export type WorkroomNote = {
  readonly title: string;
  readonly description: string;
};
```

- [ ] **Step 2: Replace copy that overstates live analysis with reference-aligned copy**

Use copy that explains PtoP’s flow: repository evidence, one-line reflection, candidate selection, and evidence-backed portfolio draft. Keep the evidence example explicitly illustrative.

- [ ] **Step 3: Add stable example evidence data**

Include four example rows matching the HTML reference, but use labels such as `예시 PR #142` and `분석 화면 예시` so users cannot mistake the data for their own repository.

- [ ] **Step 4: Update the existing data test**

Assert that workflow data has three ordered steps and that every example evidence item has a supported type, non-empty reference, title, and metadata.

- [ ] **Step 5: Run the focused test**

Run:

```bash
npm run test --workspace @ptop/web -- figmaLandingContent
```

Expected: PASS.

---

### Task 3: Split the landing story into focused section components

**Files:**
- Create: `apps/web/src/components/landing/LandingIntroSection.tsx`
- Create: `apps/web/src/components/landing/LandingWorkflowSection.tsx`
- Create: `apps/web/src/components/landing/LandingEvidenceSection.tsx`
- Create: `apps/web/src/components/landing/LandingWorkroomSection.tsx`
- Create: `apps/web/src/components/landing/LandingFinalCta.tsx`
- Modify: `apps/web/src/components/FigmaLandingContent.tsx`

**Interfaces:**
- Each section accepts `onEnterWorkspace: () => void` only when it renders a primary CTA.
- `FigmaLandingContent` remains the public composition component imported by `LandingPage`.

- [ ] **Step 1: Implement the intro section**

Create the standalone reference’s opening story with:

- Poppy greeting asset `Poppy_Hi_NOBG.png`.
- Heading that frames the problem: completed projects are difficult to turn back into portfolio evidence.
- Supporting copy limited to two short paragraphs.
- One rounded mint CTA wired to `onEnterWorkspace`.
- A small “예시 화면” label if a static preview is shown.

- [ ] **Step 2: Implement the workflow section**

Render the three workflow cards with the existing `landingSteps` data. Use distinct preview areas for repository connection, Poppy reflection, and candidate selection. Use `Poppy_Insite_NOBG.png` only in the reflection preview and reuse existing assets instead of inventing runtime data.

- [ ] **Step 3: Implement the evidence section**

Build the two-column portfolio result example:

- Left: AI-organized Background, Problem, Solution, and reflection blocks.
- Right: four evidence cards with type badges and metadata.
- Header and legend stating that this is a result example and that evidence is sourced from the repository.
- Use `ptop-demo-preview.svg` as the visual preview only when it does not conflict with the new layout.

- [ ] **Step 4: Implement the workroom section**

Render the workroom preview using `assets/landing/workspace-preview.png`, with three short notes explaining Poppy guidance, keyboard interaction, and the direct-start shortcut. Keep the image framed and responsive.

- [ ] **Step 5: Implement the final CTA**

Use the mint grid background, `Poppy_Hi_NOBG.png`, concise copy, GitHub-style start CTA, and the existing `onEnterWorkspace` callback.

- [ ] **Step 6: Compose sections in `FigmaLandingContent`**

Remove the old mixed markup and compose the five focused components in this order:

```tsx
<LandingIntroSection onEnterWorkspace={onEnterWorkspace} />
<LandingWorkflowSection />
<LandingEvidenceSection />
<LandingWorkroomSection onEnterWorkspace={onEnterWorkspace} />
<LandingFinalCta onEnterWorkspace={onEnterWorkspace} />
```

Keep the footer in the composition file or move it to a dedicated component only if the resulting file still mixes unrelated responsibilities.

---

### Task 4: Apply responsive reference styling and motion

**Files:**
- Create: `apps/web/src/components/landing/landingSectionStyles.ts` only if a shared class composition is required by more than one section
- Modify: section component class names as needed
- Modify: `apps/web/src/styles/tailwind.css` only if the existing token utilities cannot express the reference styling

**Interfaces:**
- No runtime behavior changes outside the landing page.

- [ ] **Step 1: Match the reference visual system**

Use the existing PtoP palette: dark ink for headings, mint for emphasis and actions, pale green/lavender section backgrounds, thin green borders, rounded cards, and restrained shadows.

- [ ] **Step 2: Add responsive layout rules through Tailwind classes**

Use a maximum content width around 1120px, 2-column result/workroom layouts on desktop, and one-column layouts below the existing mobile breakpoint. Ensure evidence cards wrap without forcing horizontal scroll.

- [ ] **Step 3: Preserve and extend motion safely**

Reuse `ScrollReveal` for section entrances, add only lightweight hover elevation and Poppy bobbing, and disable nonessential animation under `prefers-reduced-motion`.

- [ ] **Step 4: Verify no header or video regressions**

Do not modify `SiteHeader.tsx` or `LandingHero.tsx`. Confirm the new content begins after the existing video section and the header remains fixed/blurred as before.

---

### Task 5: Verify the landing page

**Files:**
- Test: `apps/web/src/data/figmaLandingContent.test.ts`
- Verify: rendered landing page at desktop and mobile viewports

- [ ] **Step 1: Run type checking**

Run:

```bash
npm run typecheck:web
```

Expected: PASS.

- [ ] **Step 2: Run the web tests**

Run:

```bash
npm run test:web
```

Expected: PASS.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build:web
```

Expected: PASS with both supplied mascot assets included in the output.

- [ ] **Step 4: Browser-check the page at desktop and mobile widths**

Verify:

- Header and hero video remain unchanged.
- Intro CTA opens the workspace.
- Poppy assets have no visible black background or stretching.
- Evidence example is clearly labeled as an example.
- No section produces horizontal overflow.
- Scroll reveal and hover motion work without obscuring text.

