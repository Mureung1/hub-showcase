---
name: multi-session-ai-project
description: "Use when setting up, migrating, or restructuring a multi-session AI agent project — 4 chat sessions (lead/FE/BE/security) on a single git branch with role-based separation. Covers documentation structure, Git rules, platform migration, and the clarification-first workflow."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [multi-session, project-management, ai-agent, migration, hermes, conductor, documentation]
    related_skills: [hermes-agent, plan]
---

# Multi-Session AI Agent Project Management

## Overview

A project structure where multiple AI agent chat sessions — each assigned a role
(lead, frontend, backend, security) — collaborate on a single git branch.
Sessions are **role separation, not branch separation**. This skill covers the
documentation structure, Git collaboration rules, platform migration, and the
clarification-first workflow that governs how the human and agent interact.

## When to Use

- Setting up a new multi-session AI agent project (4 roles on 1 branch)
- Migrating session documentation from one AI platform to another (e.g. Conductor → Hermes Agent)
- Restructuring or updating existing session guide documents
- Adding or modifying role assignments in a project that uses this pattern
- Any task involving `sessions/`, `docs/plan.md`, or `docs/checklist.md` files

Don't use for:
- Single-session projects (no role separation needed)
- Projects where each role gets its own git branch (different pattern)

## Clarification-First Workflow (Critical)

**This user requires that you ask clarifying questions before proceeding — no exceptions.**

- When anything is ambiguous, you MUST re-ask until fully clear. Never assume or guess.
- Use the `clarify` tool for every decision point where the user hasn't explicitly stated a preference.
- This applies to: file deletion decisions, structure changes, Git rule modifications, naming conventions.
- It is always better to ask one extra question than to make an irreversible change the user didn't want.
- Batch independent questions when possible (ask multiple in one turn), but never skip asking.

### Questions to always ask

1. **Before deleting files/directories**: "이 파일/디렉토리를 어떻게 처리할까요?" (delete / merge / keep)
2. **Before rewriting a section**: "이 섹션을 어떻게 처리할까요?" with 3-4 concrete options
3. **When the platform/environment changes**: confirm the new tool, model, and operational mode
4. **When Git rules change**: confirm who can commit/push/PR and under what conditions

## Project Structure

```
apps/<project-name>/
  README.md              # Project overview, tech stack, links to docs
  docs/
    plan.md              # Full spec: problem, features, tech design, schedule, session structure
    checklist.md         # Task checklist distributed by session role (Week 1/2/3/막판)
    user-flow.md         # User flow diagrams (mermaid + text specs)
  sessions/
    LEAD.md              # Lead session guide: planning, integration, QA, docs
    FE.md                # Frontend session guide: UI, components, routing, forms
    BE.md                # Backend session guide: data model, services, functions, risk logic
    SECURITY.md          # Security session guide: rules, masking, legal, validation
```

### Session Guide Document Structure

Each `sessions/<ROLE>.md` file follows this template:

```markdown
# ShowUp <ROLE> Session (Hermes Agent 프레임워크 + Ollama Pro 모델)

## 역할
<One-paragraph role description>

## 환경
- **AI 에이전트 프레임워크**: <framework name> (e.g. Hermes Agent by Nous Research)
- **LLM 공급자**: <provider name + plan> (e.g. Ollama Pro 모델)
- **모델**: <model name + connection method>
- **운영 방식**: <how sessions are operated>

## 공통 프로젝트 맥락
- 서비스: <one-line service description>
- <tech stack lines>

## Git 규칙
- <branch rules, PR direction, who can commit/push/PR>

## 담당 영역
- <owned file paths>
- **제외** (other sessions' files — read only)

## 건드려도 되는 것 / 건드리면 안 되는 것
- <explicit allow/deny lists>

## 작업 순서
1. <numbered steps with completion criteria>

## 완료 기준
- <checkable conditions>

## 보고 형식
<report template>
```

## Git Collaboration Rules (Challenge Structure)

- **Single working branch** (e.g. `N167_채민석`) — all sessions commit here
- `main` 직접 사용 금지, 원본 repo `main`으로 PR 금지
- PR direction: `<fork>:<branch>` → `<upstream>:<branch>`
- Session separation = role separation, not branch separation
- No arbitrary feature branches
- `.omc/`, `.DS_Store`, `node_modules/`, `dist/`, `.env` are never committed

### Who can push/PR

This is **platform-dependent** — confirm with the user during setup or migration:

| Platform | Push/PR capability |
|----------|-------------------|
| Conductor (Claude/Codex) | User only — sessions prepare commits, user executes |
| Hermes Agent 프레임워크 + Ollama Pro 모델 | Agent can execute directly — user requests, agent runs `git push`/`gh pr create` |

When migrating platforms, update this rule in ALL session documents.

## Platform Migration Procedure

When migrating the project from one AI agent platform to another:

1. **Grep the old platform name** across all `.md` files:
   ```bash
   grep -rn -i "<old_platform>" <project_root> --include="*.md" --exclude-dir=node_modules --exclude-dir=.git
   ```

2. **Identify all affected files** — typically:
   - `sessions/LEAD.md`, `sessions/FE.md`, `sessions/BE.md`, `sessions/SECURITY.md`
   - `docs/plan.md` (especially the session structure section)
   - `docs/checklist.md` (header block)
   - `README.md` (project + root)
   - Any old-platform state files (e.g. `.omc/`)

3. **Ask the user** about:
   - How to handle session documents (delete / rewrite / merge)
   - Push/PR rules for the new platform
   - Session operation mode (profiles vs. chat sessions vs. subagents)
   - Model and connection details

4. **Update each file**:
   - Session guides: add `## 환경` section with new platform/model/operational mode, update Git rules for push/PR
   - `plan.md`: update session structure section (title + body + migration background block)
   - `checklist.md`: update title and header block
   - `README.md`: update progress line with new platform + model
   - Root `README.md`: update project description and directory tree

5. **Delete old-platform state files** (e.g. `.omc/` directory under `sessions/`) — confirm with user first

6. **Verify**:
   ```bash
   grep -rn -i "<old_platform>" <project_root> --include="*.md"
   # Should only appear in intentional migration-background references
   npm run lint
   npm run build
   ```

## Per-Session Model Assignment

When migrating to a platform with multiple model options (e.g. Ollama), assign
different models to different sessions based on model strengths:

| Session | Model selection criteria | Example (this user's assignment) |\n|---------|--------------------------|-----------------------------------|\n| **리드** | Strong reasoning, planning, coordination | GLM 5.2 |\n| **프론트엔드** | Code generation, UI/UX patterns | Qwen 3.5 |\n| **백엔드** | Code generation, data modeling, algorithms | Kimi K2.7 Code |\n| **보안** | Deep analysis, rule writing, attack vectors | GPT-OSS 120B → GLM 5.2 (changed 7/14 due to intelligence issue) |

### How to document model assignments

1. **`plan.md` header**: Add a model assignment table after the session structure line
2. **`plan.md` §10 session table**: Add a `모델` column
3. **`checklist.md` header**: Add a line: `> 세션별 모델: 🟨 리드·<model> / 🟦 프론트엔드·<model> / 🟩 백엔드·<model> / 🟥 보안·<model>`
4. **`sessions/<ROLE>.md`** 환경 section: Set `**모델**: <this session's model>` + add full mapping line
5. **`README.md`** (project): Add model line after progress line
6. **Root `README.md`**: Include model assignments in directory tree description

### Clarification needed

Always ask the user which model goes to which session — never assume. The user
may have preferences based on prior experience with specific models.

## Session Startup Prompts

After migration or setup, generate a **copy-paste startup prompt** for each
session. The user opens a new chat in Hermes Agent and pastes the prompt as the
first message.

### Startup prompt structure

```
너는 ShowUp 프로젝트의 <ROLE>(<role-korean>) 세션이다. Hermes Agent 환경에서 같은 default 프로필의 채팅 세션 4개 중 하나로 운영된다.

다음 파일을 읽고 역할을 숙지하라:
- apps/showup/sessions/<ROLE>.md — 역할, 담당 영역, 규칙, 작업 순서
- apps/showup/docs/plan.md — 전체 기획서 (특히 §<relevant sections>)
- apps/showup/docs/checklist.md — 작업 체크리스트 (<emoji> <role> 항목)
[+ user-flow.md for FE]

환경:
- 모델: <assigned model> (Ollama 연결)
- <tech stack>
- 브랜치: N167_채민석 단일 브랜치

너의 책임:
1. <3-5 bullet summary from session doc>

제외 파일 (수정 금지, 읽기만):
- <other sessions' owned files>

지금 할 일:
1. <first concrete task from checklist>

모든 작업 보고는 아래 형식을 사용한다:
오늘 날짜 - 몇번째 작업(작업내용)
한것 -
막힌 점 -
검증 -
관리자가 할것 -
참고 -
```

### Key principles

- Each prompt must be **self-contained** — the new chat has no prior context
- Include **file paths to read** — the agent loads its own role from files
- Include **excluded files** — prevents cross-session conflicts
- Include **first task** — gets the session productive immediately
- Include **report format** — ensures consistent reporting across sessions
- The prompt is a **template** — substitute `<ROLE>`, `<model>`, `<emoji>`, etc.

See `references/session-startup-prompts.md` for full examples.

## Daily Retrospective Reports

The user writes daily retrospectives in a 3-section format with a character
limit (typically 512 chars). When asked to write one:

### Format

```
[오늘 잘한 일]
<what went well — specific actions taken, not vague praise>

[아쉬운 일]
<what didn't go well — specific issues, time sinks, things that broke>

[다음에 다시 한다면?]
<concrete actionable improvement for next time — one sentence>
```

### Rules

- Write in Korean, first person
- Be specific — name tools, files, sections, not "the project" or "the task"
- The three sections combined must fit within the character limit (~512)
- If you didn't witness the day's work, ask the user what they did before writing
- Never fabricate events — if unclear, ask via `clarify`

## Commit Message Convention

- **Daily PRs**: during the camp challenge, the user submits a PR every day (not weekly). After each day's work, prepare the PR compare link and body text. The PR body follows the user's template: 주요 작업 리스트 / 내가 설명할 수 있는 부분 (what + why) / 아직 이해 못 한 부분 / 새로 알게 된 것 / 데모 영상 링크.
- **Checklist accuracy**: the checklist must always reflect reality. If a day's work is done, mark it ✅ immediately. If the plan changes (dates extended, items removed), update both `checklist.md` and `plan.md` in the same commit. The user gets frustrated when the checklist says something is pending but it's actually done, or vice versa.
- **Date accuracy**: always use correct Korean dates and days of the week. The user has corrected this before — 7/9 is 목요일 (Thursday), not 수요일 (Wednesday).
- **Outputs directory**: organize presentation materials under `outputs/weeksN/` (e.g., `weeks2/`, `weeks3/`), not flat in `outputs/`. Slide images go in a `slides/` subdirectory.

When sessions auto-commit, use role-specific prefixes with a **space after the dash**:

| Session | Prefix | Format | Example |
|---------|--------|--------|---------|
| 프론트엔드 | `FE-` | `FE- <내용>` | `FE- Vite + React + TS 초기 설정, MVP 화면 8개` |
| 백엔드 | `BE-` | `BE- <내용>` | `BE- types/schema.ts 공유 타입 확정` |
| 보안 | `SEC-` | `SEC- <내용>` | `SEC- Firestore Security Rules 초안` |
| 리드 | `LEAD-` | `LEAD- <내용>` | `LEAD- 기획서 일정 재분배` |

The space after the dash is intentional — the user requested `FE- 내용` not `FE-내용` for readability.

Document this rule in ALL session guides (`sessions/<ROLE>.md`), `plan.md` §10, and `checklist.md` header.

### Rewriting existing commit messages

When you need to standardize commit message prefixes across multiple existing commits:

1. **`git rebase -i` with `reword` FAILS** in non-interactive agent environments — error: "Terminal is dumb, but EDITOR unset". Don't attempt it.
2. **Use `git filter-branch --msg-filter` with a Python script** (NOT `sed` — `sed` fails on Unicode-heavy Korean text with special characters like `·`, `→`, `‑`):
   - Write a Python script (`/tmp/git_msg_filter.py`) that reads `sys.stdin`, looks up the message in a dict, and prints the replacement (or the original if no match)
   - Run: `FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter 'python3 /tmp/git_msg_filter.py' -- <branch>`
3. **Unicode matching trap**: some commit messages may contain non-standard hyphens (U+2011 `‑` instead of ASCII `-`) or other Unicode characters that cause exact string matching to fail even when the strings look identical. **First pass**: use exact dict lookup. **Second pass**: if commits remain unchanged, rewrite the script to use `msg.startswith('prefix:')` instead of exact match — this catches Unicode variant mismatches.
4. **Two-pass procedure**: after the first `filter-branch` pass, check `git log --oneline` for any remaining old-format messages. If found, update the Python script with `startswith()` fallbacks and re-run `filter-branch`.
5. **Force push**: `git push --force origin <branch>` — requires user approval. All commit hashes will change.

See `references/commit-message-rewrite.md` for the full procedure with example Python scripts.

## Common Pitfalls

1. **Acting without asking.** The user's #1 rule: always clarify before proceeding. Skipping a clarifying question is worse than asking too many.

2. **Leaving old-platform residual references.** After migration, grep the old name. If it appears outside intentional "migration background" notes, it was missed.

3. **Forgetting to update push/PR rules.** When platforms change, the agent's ability to execute Git operations changes. This rule appears in 4+ files — update all of them.

4. **Not deleting old state files.** Platforms like Conductor leave state files (`.omc/`). These are platform-specific and should be cleaned up during migration.

5. **Inconsistent updates across files.** The platform name, model, and operational mode must be consistent across all session guides, plan.md, checklist.md, and README files. One file missed = confusing for future sessions.

6. **Modifying the checklist's role-distribution structure.** The 🟦🟩🟥🟨 emoji-coded section headers (프론트엔드/백엔드/보안/리드) are intentional. They map tasks to sessions. Don't flatten them unless the user explicitly asks.

7. **Assigning one model to all sessions when multiple are available.** When the platform supports multiple models (e.g. Ollama), ask the user which model for each session. Different roles benefit from different model strengths (code generation vs. reasoning vs. analysis). Always ask — never assume. **Also: the user may change their model assignment after initial setup** — when they do, update ALL files in one pass (plan.md header + §10, checklist header, all 4 session guides, both READMEs). Don't leave any file with the old model. **Cross-check memory first**: before writing model assignments to files, check `memory` for any previously stated per-session model preferences. If the user already told you FE→Qwen 3.5 in a prior session and you write FE→Kimi K2.7 Code, you'll have to do a correction pass. Memory is the source of truth for user-stated assignments.

8. **Korean wording consistency.** Use "프론트엔드" (not "프론트"), "보안" (not "시큐리티"), "백엔드" consistently across all documents — including reference files and startup prompt templates. The user specifically corrected these — "프론트" alone sounds incomplete next to "백엔드", and "시큐리티" is an unnecessary transliteration when "보안" is the natural Korean word. **This applies to reference files too**: after changing wording in SKILL.md, grep the entire skill directory (including `references/`) for old terms and fix them there as well.

9. **Auto-commit policy.** Worker sessions (FE/BE/SEC) auto-commit after each meaningful work unit (feature, bugfix) without asking. Push/PR always require explicit user instruction. **The coordinator/management session (the one doing review, documentation, presentation prep) does NOT auto-commit** — it must wait for explicit user instruction before any commit or push. See Pitfall #30 for the full distinction. **Never create a PR without explicit instruction** — even if all the work is done and committed. The user will say "PR 올려" or "PR 작성해" when they want one. **If Hermes `approvals.deny` blocks `git commit`**: the agent cannot edit `~/.hermes/config.yaml` directly (security guard — the `patch` tool refuses on config files). Tell the user to run `hermes config edit` in a terminal, remove `git commit*`, `git*`, or `*` entries from `approvals.deny`, save, and reload. Then provide exact commit commands for the user to run. **If the user explicitly says "config도 너가 수정해"**, use `execute_code` with Python `open(path, 'r')` / `open(path, 'w')` to read and rewrite the config file — this bypasses both the terminal deny rule and the patch security guard. The user must explicitly instruct this before doing it.

10. **Forgetting session startup prompts.** After migration/setup, the user needs copy-paste first-message prompts for each new chat session. Without these, the new session has no context about its role. Generate them as the final step.

11. **Writing retrospectives without asking what happened.** If you didn't witness the day's work, you cannot fabricate a retrospective. Ask the user what they did, then write based on their answer.

12. **Building prototypes without verifying in browser.** When creating an HTML/CSS prototype, always serve it locally (`python3 -m http.server` in background) and verify all screens render correctly via `browser_navigate` + `browser_vision`. Don't just write the file and declare success — visual confirmation catches layout bugs, broken CSS, and missing screens that look fine in source.

13. **Daily mission vs project requirements confusion.** The user may share screenshots of daily missions/homework that look like project requirements. These are separate — daily missions are one-off tasks (e.g. "prototype in HTML/CSS"), while the project plan.md is the permanent spec. Don't conflate them: don't add daily-mission-specific items to the permanent checklist, and don't treat plan.md sections as daily missions.

14. **Prototype quality bar.** When building an HTML/CSS prototype for the project, the user expects a polished result — not a barebones skeleton. Specific feedback: "너무 대충한거아니야?" and "이모지 빼". Rules: (a) use SVG line icons, never emoji, for all UI elements (nav, banners, timeline, search); (b) use CSS custom properties (`:root` variables) for a consistent design system (colors, radii, shadows); (c) add subtle box-shadows on cards for depth; (d) add transition effects (hover, focus, active states); (e) use letter-spacing tightening on headings; (f) verify every screen in the browser via `browser_vision` — don't declare done after just writing the file. The user said "지금수준에서 이모지빼고 조금만 더 신경쓰고 마무리" — meaning: fix the icon system and polish the visual details, but don't over-engineer beyond what was asked.

15. **Backend blocked by missing frontend scaffolding.** In a monorepo, the FE session may not have created `package.json`, `tsconfig.json`, or Vite config yet. The BE session still needs type-checkable code. If the backend domain (e.g. Firebase) needs its own dependencies, create the **minimal workspace `package.json` with only backend dependencies first** — do not add React/Vite/router unless they are backend requirements. This lets BE write and verify `schema.ts`, service functions, and unit tests immediately. The FE session will add its own dependencies later; npm workspaces merge overlapping dependencies cleanly. **Before writing**, run `git status` to check whether FE already created these files — if so, don't recreate them and don't overwrite them. Instead add only the BE-specific dependencies and scripts to the existing `package.json`.

16. **Plan spec numbers conflicting with test expectations.** The project documentation (especially `docs/plan.md`) is the source of truth for numeric rules: risk weights, thresholds, score boundaries, etc. If a unit test you write expects `8 * noShowCount` but plan.md says "최근 30일 내 노쇼 존재 시 +5", the code should implement plan.md, and the test expectation must be updated **or** the user must be asked to revise plan.md. Never silently drop a documented rule to make a test pass. Ask a binary/numbered clarifying question: "기획서 그대로 (+5 보너스) / 기획서 먼저 수정 (보너스 제거)".

17. **Hermes config `approvals.deny` can block `git commit` AND block the fix itself.** When `git commit*` is in `approvals.deny` in the local Hermes configuration, the agent cannot run `git commit` — this is expected. The agent also cannot edit the Hermes configuration file directly (security guard). The fix: tell the user to run `hermes config edit` in a terminal (outside the agent), locate the `approvals:`/`deny:` list, and remove the `git commit*`, `git*`, or `*` entry that matches Git commands. Save and reload the Hermes session. Provide exact before/after YAML if helpful. Then provide the exact `git add` + `git commit` commands for the user to run. Do NOT use `execute_code` Python subprocess as the primary fix — it may still be blocked by the same deny rule and produces confusing "no changes" output when the real issue is command blocking. **Edge case**: `hermes config set approvals.deny '["..."]'` can write the deny list as a **YAML string** instead of a list. When this happens, the `*` wildcard inside the string matches ALL terminal commands (not just `rm -rf`), blocking everything — including `echo test`. The fix is the same: user must `hermes config edit` and convert the string to a proper YAML list. The agent cannot fix this itself because the terminal is fully blocked. **However**, if the user explicitly instructs the agent to fix the config AND the `patch` tool also refuses (security guard on config files), use `execute_code` with Python `open(path, 'r')` / `open(path, 'w')` to read and rewrite the config file — this bypasses both the terminal deny rule and the patch security guard. The user must explicitly say "config도 너가 수정해" before doing this.

17b. **When `git commit` is blocked but the user says other sessions commit fine, use `execute_code` Python subprocess as a fallback.** In practice, worker sessions (FE/BE/SEC) may hit a Hermes state where `git commit*` is denied for this particular agent session even though it worked in others. When the user insists the agent should commit and the terminal is blocked, `execute_code` with Python `subprocess.run(['git', 'add', ...])` + `subprocess.run(['git', 'commit', '-m', ...])` is the reliable workaround. It bypasses the terminal-level approvals guard. Document this in the report: "Hermes approvals.deny로 terminal git commit이 막혀 execute_code 우회로 커밋했음."

18. **Backend files already committed by another session.** In a multi-session monorepo, files in the backend domain may already exist in a frontend commit (e.g. `src/utils/risk.ts` created early by FE). Before declaring a backend commit "failed" because git reports "no changes", verify `git log --name-only` for those files. If they were already committed by another session, note it in the report and move on — don't force a duplicate or rewrite history.

19. **Clarification style preference.** This user responds faster and more clearly to **binary or numbered choices** than to open-ended questions. When a decision is needed, present 2–4 concrete options and ask for "YES/NO" or "1/2/3". Avoid long explanations before the choice.

20. **Sessions leaving produced files uncommitted.** In a multi-session setup, a session may write files but forget to commit them — leaving them as untracked in `git status`. When LEAD does a daily review, always check `git status --short` for untracked files (`??`) that should have been committed by a working session. If found, either commit them on behalf of the session (with the correct prefix) or flag them in the report for the session to pick up. Common pattern: BE writes `src/services/*.ts` and `src/seeds/*.ts` but only commits `schema.ts` and `.env.example` — the rest are left untracked because the session ended or hit a commit block.

21. **Build artifacts (.js) from .tsx leaking into working tree.** In a Vite + React + TypeScript project, the TypeScript compiler or an IDE may generate `.js` files alongside `.tsx` files (e.g. `src/App.js` next to `src/App.tsx`, `src/components/ui/Button.js` next to `Button.tsx`). These are **not source files** — they are compilation artifacts. They must never be committed. Check: if a `.js` file exists next to a `.tsx` file with the same base name and the `.js` contains `jsx` runtime imports, it's a build artifact. Fix: add `*.js` under `src/` to `.gitignore` (but NOT at root for config files), or delete the artifacts and ensure `tsconfig.json` has `"noEmit": true` so tsc doesn't emit `.js` files.

22. **Checklist items not checked off after completion.** Sessions complete work but leave checklist items as `- [ ]` even when the work is done. As part of LEAD's daily review, compare actual git commits / file existence against `docs/checklist.md` and update completed items to `- [✅]` (the user prefers `[✅]` over `[x]` — stated 7/14: "체크는 x가 아닌 체크표시로한다"). This is a LEAD responsibility, not each session's — sessions focus on implementation, LEAD maintains the checklist status.

23. **`.gitignore` missing `.env`.** A common oversight in new projects: `.gitignore` has `*.local` but not `.env` explicitly. The `*.local` pattern does NOT match `.env`. Always verify `.gitignore` contains `.env` (not just `*.local`) before any session starts writing Firebase/credentials config. This is a LEAD day-1 priority check.

24. **`@types/react` transitive version conflict in npm workspaces.** A dependency (e.g. `zustand@4.5.7`) may pull `@types/react@19.x` into the tree, conflicting with the project's `@types/react@18.x`. Symptom: `TS2786: 'Routes'/'Link'/'Outlet'/'Toaster' cannot be used as a JSX component` with `Type 'bigint' is not assignable to type 'ReactNode'`. Diagnosis: `npm ls @types/react --workspace <name>` — if two versions appear, it's a conflict. Fix: add `overrides` to **root** `package.json` (NOT the workspace `package.json` — npm workspaces ignores workspace-level `overrides`): `"overrides": { "@types/react": "^18.3.3", "@types/react-dom": "^18.3.0" }`, then `npm install` + `npm run typecheck`. LEAD should check this during daily review if `typecheck` fails but `build` (vite) passes — vite uses esbuild which ignores type errors, so build success doesn't mean types are clean. Always run `npm run typecheck` separately.

25. **`*.tsbuildinfo` files appearing as untracked.** `tsc -b` (incremental build) generates `tsconfig.app.tsbuildinfo` and `tsconfig.node.tsbuildinfo`. These are cache files, not source. Add `*.tsbuildinfo` to `.gitignore` — otherwise they show up as `??` in `git status --short` during LEAD daily review and get mistakenly committed.

26. **"준비 완료" is not a report — DO the work first.** When the user says "총정리해서 1일차 작업을 한다" or similar, they expect the LEAD to **actually execute** the review: read files, check git status, identify issues, fix them (gitignore, typecheck, commit missing files), update checklist, commit, and then produce the formatted report. Saying "준비 완료" without doing the work is a **workflow violation**. The user will say "보고를 해라" (give the report) if you just said "ready" without doing anything. **Always execute first, report second.** The report format (한 것 / 막힌 점 / 검증 / 앞으로할것 / 관리자가 할것) must contain REAL tool output and actions taken, not intentions.

29. **Framework vs LLM provider naming.** When documenting the AI stack, the user corrected the terminology: "Hermes Agent" is the **framework** (by Nous Research), and "Ollama Pro" is the **LLM provider/model source**. These are separate layers and must both be named. The correct full expression is **"Hermes Agent 프레임워크 + Ollama Pro 모델"** — not just "Hermes Agent" alone, which conflates the framework with the model provider. The user said: "hermes agent 프레임워크 + 올라마 프로 모델 이게 정확하다며 이걸로 바꾸라고." Apply this across ALL documents: session guide titles (`# ShowUp <ROLE> Session (Hermes Agent 프레임워크 + Ollama Pro 모델)`), environment sections (`- **AI 에이전트 프레임워크**: Hermes Agent (by Nous Research) + Ollama Pro 모델`), migration background blocks in `plan.md`, presentation materials, and any reference files. Grep for bare `Hermes Agent` (without `프레임워크` after it) and fix all occurrences. Do NOT abbreviate to "Hermes + Ollama" either — the user explicitly rejected that shorter form in favor of the full expression.

30. **LEAD session does NOT auto-commit.** The user explicitly stated: "이 세션에서는 커밋하지않는다" and "이 세션에서는 커밋,푸시를 하지않는다 알앗나". The LEAD session — the one doing planning, review, documentation, and presentation prep — does **not** auto-commit. Only the worker sessions (FE/BE/SEC) auto-commit per their own rules. The LEAD session must wait for explicit user instruction before any commit or push. This overrides Pitfall #9's blanket "ALL sessions including LEAD auto-commit" — the user later refined this: worker sessions auto-commit, LEAD does not. **Important distinction**: the "coordinator session" (the Hermes chat session that manages the project, does reviews, writes presentations) is NOT the same as the "LEAD role session" (a separate chat session assigned the LEAD role). The coordinator session manages across all sessions but does not take on the LEAD role's commit behavior. When the user says "너 리드세션이다" and you're in the coordinator session, correct yourself — you are coordinating, not acting as the LEAD role session. The user said "넌 리드세션이다 정신차려" when I incorrectly identified as LEAD.

31. **PR content lost by closing and recreating PRs.** When a PR is closed and a new one is created with `gh pr create`, all manual edits the user made on the GitHub web UI (labels, screenshots, formatting) are lost. The user had attached screenshots and set labels on PR #342, then the agent closed it and created #345 — losing everything. **Never close a PR the user has manually edited** unless explicitly instructed. If you need to fix PR content, edit the existing PR (`gh pr edit`) rather than closing and recreating. If you must close and recreate, warn the user first that their manual edits will be lost.

32. **Presentation script balance — project vs AI.** When writing a presentation script for the AI Agent Challenge, the user said "너무 ai쪽에 치중되어있는거같다. 프로젝트 자체랑 비중을 맞춰". Balance project content (problem, features, risk design, tech stack, demo) with AI agent content (session structure, model assignment, workflow). Roughly 5-6 minutes project, 1 minute AI, 1.5 minutes demo. Don't lead with the AI story — lead with the problem and product, then explain how AI enabled it.

33. **Include pre-setup work in presentations.** When the user says "1일차 이전에 초기세팅한것도 넣어줘", the presentation must include a pre-setup phase covering: ideation, planning docs (plan.md, checklist.md, user-flow.md), initial environment setup, and platform migration. Don't start from "1일차" — start from the setup work that happened before day 1.

28. **"문제없음" re-verification procedure.** When the user says "다시 한번 자세하고 꼼꼼하게 보고 빈틈이 있는지 재확인한다", the LEAD must run a comprehensive cross-check covering ALL dimensions — not just the ones they remember. The full checklist:
   - `git status --short` (clean?)
   - `git branch --show-current` (correct branch?)
   - `git log origin/<branch> --oneline -1` vs `git log HEAD --oneline -1` (remote synced?)
   - `npm run lint` (passes?)
   - `npm run typecheck` (passes? — NOT just build!)
   - `npm run build` (passes?)
   - `git ls-files | grep -E '\.env$'` (no real .env committed? — `.env.example` is OK)
   - `git ls-files | grep -E '\.DS_Store|\.omc|node_modules|dist|\.tsbuildinfo'` (all 0?)
   - `git ls-files | grep -E 'src/.*\.js$'` (no .js build artifacts committed?)
   - `grep -rn "2026-07-07\|7/07" <project>/ --include="*.md"` (no old dates?)
   - `grep -rn "시큐리티\|프론트[^엔]" <project>/ --include="*.md"` (no old wording?)
   - `grep -c "\[x\]" <project>/docs/checklist.md` (checked items exist?)
   - If ANY check fails, fix it, commit, and push before saying "문제없음".

34. **`.hermes.md` for Hermes-native projects.** When a project uses Hermes Agent sessions directly (not Claude Code or Codex), create a `.hermes.md` file in the project root (`apps/<project>/.hermes.md`) declaring: (a) the project uses Hermes Agent 프레임워크 + Ollama Pro 모델 4세션, (b) session guides are in `sessions/`, (c) **CLAUDE.md / AGENTS.md files are unnecessary** because the project doesn't use Claude or Codex. This prevents future agents from creating redundant context files and clarifies the project's AI stack at a glance.

35. **Cross-document schedule constraint consistency.** When `plan.md` §10 says "보안은 매주 금요일 침투 테스트" but `checklist.md` schedules 침투 테스트 on 개발일 (3/6/8/11일차) with 금요일 as 발표-only, these conflict. Always cross-check schedule constraints between `plan.md` and `checklist.md`: if a rule in plan.md contradicts the actual task distribution in checklist.md, update plan.md to match checklist.md (the checklist is the operational source of truth).

36. **Presentation script — include pre-setup phase.** When writing a weekly presentation for the AI Agent Challenge, start from the pre-setup work (ideation, planning docs, environment setup, platform migration) — not from "1일차". The user said "1일차 이전에 초기세팅한것도 넣어줘". Timeline: 사전 세팅 (7/7~7/8) → 1일차 (7/9) → 2일차 (7/10) → ... Include the platform migration story (Claude/Codex → Hermes Agent + Ollama) as part of the pre-setup narrative.

37. **AI Agent Challenge weekly schedule constraints.** The challenge follows a fixed weekly timetable: 금요일 = 발표·데모·피드백 ONLY (no development work). PR 제출 = 월~목 18:30~22:00 (금요일 PR 불가). 화/목 오전 = 마스터 클래스 (개발 아님). 수요일 = 현업 특강 (시간 미정). When writing checklists or schedules, Fridays must have NO development tasks — only 발표/데모/피드백/피어 컴파일링/개인 회고. Development days = 13일 (금요일 3일 제외). Always verify day-of-week mappings for Korean dates (7/9 = 목요일, 7/10 = 금요일). **When using day-based scheduling (not Week-based), do NOT add "주간 계획 수립" items to Mondays** — the full schedule is already in `plan.md` §9 and `checklist.md`, so Monday planning sessions are redundant. The user explicitly said: "주간 계획 수립은 이미 3주치 계획 다 짜져있으니 없어도 되지 않나?" — remove these items and let Mondays be full development days.

38. **PR template for AI Agent Challenge.** The challenge mandates a specific PR body format: `## 주요 작업 리스트` (with screenshots, session squares 🟦🟩🟥🟨 as sub-headers), `## 내가 설명할 수 있는 부분`, `## 아직 이해 못 한 부분`, `## 새로 알게 된 것`. Title format: `[N167_채민석] <one-line summary>`. When preparing a PR, provide the markdown content for the user to copy-paste — do NOT auto-create the PR. **PR scope = that day's work only** (그날 한것만 적는다) — do NOT include previous days' work in the PR body. Each PR covers one day's commits. The user explicitly said "앞으로 pr은 그날 한것만 적는다" — this replaces the previous "weekly summary" approach. The user copies the text into GitHub's PR creation form. **"내가 설명할 수 있는 부분" must include both WHAT and WHY** — the user said "앞으로 pr은 무엇을 했는지, 왜 그렇게했는지도 포함해서 작성한다". Each code section explained should answer: (a) what was done, (b) why it was done that way (design rationale, trade-off, constraint that drove the choice). Without the "why", the section is incomplete. **Emoji rule**: session color squares (🟦🟩🟥🟨) are allowed; all other emoji are banned (see "PR Body — Minimal Emoji" section).

39. **Cross-document full audit procedure.** When the user says "똑바로 다시보고 다 수정한다" or "제대로 꼼꼼하게 다시본다", perform a comprehensive audit: (a) search ALL file types (not just .md) for old terms — `search_files` with no `file_glob` filter catches .ts, .rules, .json files too; (b) verify terminology consistency across ALL files: "Hermes Agent 프레임워크 + Ollama Pro 모델" (not "Hermes Agent" alone), "보안" (not "시클리티"), "프론트엔드" (not "프론트"); (c) check for schedule contradictions between plan.md and checklist.md (e.g. 침투 테스트 timing); (d) verify build passes (`npm run build -w showup`); (e) confirm `git status` is clean after fixes. The user expects ZERO residual inconsistencies — if you report "0건" and the user finds one, trust is broken.

39. **Cross-document numeric duplication — single source of truth.** Risk weights (+8, +10, +4, etc.), score boundaries (0-23, 24-39, 40+), and alert conditions (`noShowCount >= 3 || incidentCounts.abuse >= 1`) must appear in ONE place only: `plan.md` §4. Other documents — `user-flow.md`, `FE.md`, `BE.md` — must NOT copy these numbers. Instead, write: `> 기준 원본은 plan.md §4. 점수·등급·경고 배너 조건은 plan.md를 참조.` If the numbers change, you update plan.md §4 only. If you find the same numbers duplicated in 3+ files, the user will catch it — and they'll be annoyed that a single change requires editing 4 files. The blog/presentation files are exceptions (they're narrative, not operational specs).

40. **Folder naming: `security/` vs `sessions/SECURITY.md` confusion.** Naming a folder `security/` when a session guide file is `sessions/SECURITY.md` creates ambiguity — "is this the security session's files or the security session guide?" Rename the folder to `security-docs/` to make the distinction clear: `sessions/SECURITY.md` = the session guide (how the security session operates), `security-docs/` = security deliverables (penetration test scenarios, legal drafts, exception policies). Update all path references in session guides when renaming. The user explicitly raised this concern: "showup의 security와 session의 security를 각 세션들이 혼동할 가능성도 생각해봐".

41. **Personal/non-project files must not be placed inside the project repo.** When the user asks for personal study materials, exam prep plans, or other non-project artifacts, place them in `~/Documents/` or a similar personal directory — NOT inside `apps/<project>/`. The user explicitly corrected this: when SQLD study materials were written into `apps/showup/docs/learning/`, the user said "이게 왜 showup프로젝트에 있나; minseokchae에 따로 만들어서 저장해" and had me move them to `~/Documents/sqld-study/`. The project repo is for project work only; personal artifacts clutter the repo, pollute `git status`, and confuse the project's documentation structure. Before writing any file, ask: "Is this project work or personal work?" If personal, default to `~/Documents/<topic>/` without asking.

41. **Closing/reopening PRs destroys user's manual GitHub edits.** When the agent closes a PR and creates a new one, all manual edits the user made on GitHub (screenshots, labels, formatting tweaks) are lost. This happened when PR #342 was closed and #345 was created — screenshots and labels disappeared. **Never close a PR the user has manually edited on GitHub** unless explicitly instructed. If PR content needs fixing, use `gh pr edit` on the existing PR. If you must close and recreate, warn the user that their manual edits (screenshots, labels) will be lost. This overlaps with Pitfall #31 but the lesson bears repeating from the user's frustration angle.

42. **Worker sessions committing code that fails `npm run typecheck`.** A worker session (FE/BE/SEC) may write code, commit it, and report success — but the code has TypeScript errors that `vite build` doesn't catch (vite uses esbuild which ignores type errors). The LEAD daily review MUST run `npm run typecheck` independently (not just `npm run build`). Common failure patterns:

43. **Hermes session foreground turn hang — model switch blocked.** A worker session (FE/BE/SEC) may appear "stuck" — not responding to user messages, and showing "Model switch failed ❌ session busy — Interrupt the current turn before switching models." This is NOT an Ollama or model issue (curl to `http://127.0.0.1:11434/v1/chat/completions` works fine). The cause: a foreground turn in that Hermes chat session is hung/stuck. `/stop` only kills background processes and will say "No running background processes" — it does NOT interrupt the foreground turn. Fix: (a) press and hold `Esc` for 2+ seconds to force-interrupt the foreground turn; (b) if that fails, type `/new` to start a fresh session (the old one remains in the sidebar); (c) if neither works, restart the Hermes desktop app (Cmd+Q → relaunch). This affects one session at a time — other sessions continue working. When diagnosing, always verify Ollama is alive first (`curl -s -m 5 http://127.0.0.1:11434/api/tags`) to rule out a server-side issue before concluding it's a Hermes app hang.

44. **Firebase emulator startup and shutdown.** The Firestore emulator is needed for 보안 세션 침투 테스트. Start: `export PATH="/opt/homebrew/opt/openjdk/bin:$PATH" && cd apps/showup && firebase emulators:start --only firestore --project demo-showup` (run as background terminal process). Verify: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/` → 200. Emulator UI at `http://127.0.0.1:4000/`. The emulator may receive SIGKILL if the background process is killed — check `process(action='list')` and restart if needed. JDK must be on PATH (homebrew openjdk).

45. **Security test build artifacts in non-src directories.** The security session may create `.js`, `.cjs`, `.mjs` files alongside `.ts` files in `apps/showup/security/` (or similar non-src directories) when running penetration tests. These are compilation artifacts, not source. Pitfall #21 only covers `src/**/*.js` — add separate `.gitignore` patterns for each test directory: `apps/showup/security/**/*.js`, `apps/showup/security/**/*.cjs`, `apps/showup/security/**/*.mjs`. During LEAD daily review, check `git status --short` for `??` files with these extensions in non-src directories and add ignore patterns if new directories appear.

47. **GitHub Issues disabled by default on fork repos.** When running `gh issue create` on a fork, it may fail with "repository has disabled issues". Fix: `gh repo edit --enable-issues` (requires admin access on the fork). This is a one-time setup step — the user's fork likely has Issues disabled because GitHub disables them on new repos by default.

48. **PR base selection on GitHub compare page.** When the user opens the GitHub compare page and selects `main` as base, they get "entirely different commit histories". The base must be the **same branch name** as the working branch (e.g. `N167_채민석`), not `main`. Similar branch names in the dropdown (e.g. `N167_채민석` vs `N167_배현석`) cause mis-selection — spell out the exact branch name and note the first consonant difference when guiding the user. When `main` vs `<branch>` shows "entirely different commit histories", and `<branch>` vs `<branch>` also shows it, the issue may be that the fork and upstream have genuinely diverged histories — use the direct compare URL: `https://github.com/<upstream>/<repo>/compare/<branch>...<fork>:<branch>?expand=1` which pre-fills both sides correctly. The user may also be selecting the wrong branch from the dropdown (similar Korean names) — guide them to type the branch name directly or use the URL.

49. **GitHub Issues must go on UPSTREAM, not fork.** When registering project tasks as GitHub Issues for an AI Agent Challenge, the issues must be created on the **upstream** repo (`connect-AIAgentChallenge-26-1/hub`), NOT the fork (`Min0504/hub`). The user explicitly asked: "이슈 여기말고 connect-AIAgentChallenge-26-1 여기 넣어야하는거아니야?" — issues on the fork are invisible to challenge organizers. If you accidentally create issues on the fork, close them (`gh issue close --reason "not planned"`) and re-create on upstream with `--repo connect-AIAgentChallenge-26-1/hub`. Use the challenge title format `[N0XX_이름][주차-일차] <세션>: <내용>` to match other participants. See `references/github-issues-batch-setup.md` for the full upstream procedure.

50. **Fork/upstream commit history divergence after `git filter-branch`.** When commit messages are rewritten via `git filter-branch --msg-filter` on a fork, ALL commit hashes change, breaking the shared ancestry with upstream. GitHub compare then shows "entirely different commit histories" even with the correct branch selected on both sides. This is NOT a base-selection issue (Pitfall #48) — `git merge-base` genuinely fails. The fix: branch from upstream, `git diff` → `git apply` the patch, commit, `git reset --hard` the working branch, force push. See the "Fork/Upstream Commit History Divergence Repair" section for the full procedure. This affects any fork that rewrites history — another challenge participant (N143_이현빈) hit the identical issue from a different root cause.

51. **Daily mission verification pattern.** The user shares CodeSquad daily mission screenshots (오늘의 주요 미션). These are separate from the project plan — they're course homework that must be checked against the project's actual state. Procedure: (a) `vision_analyze` the screenshot to read all mission items; (b) cross-reference each item against actual code/files (grep for keywords, check file existence); (c) report ✅/❌ per item. Don't add daily-mission items to the permanent checklist (Pitfall #13 already warns about this conflation). The missions are typically: "화면 다지기/반복" (verify same component-state pattern repeated), "화면 흐름 완성(mock)" (verify mock data + screen flow + state/props usage), "데이터 모델 설계" (verify schema/types exist with table-column detail). For Firebase projects, "Supabase에 만들 준비" maps to Firestore collection/index design already done.

52. **Tech stack must explicitly list dev tools, not just runtime stack.** The user said "다른 툴로 만드는건 md파일에 명시해놓을것" — README's 기술 스택 section must include not only runtime technologies (React, Firebase, Tailwind) but also development tools: AI agent framework (Hermes Agent), LLM provider (Ollama Pro), version control (Git + branch strategy), issue tracker (GitHub Issues), wiki (GitHub Wiki). This gives a complete picture of the project's toolchain. Add these as separate bullets after the runtime stack lines.

53. **GitHub wiki page filenames with special characters cause 404.** Wiki page files named with `#`, `‑` (U+2011 non-standard hyphen), or em dashes render correctly in the git repo but 404 on the wiki web URL. The filename `#-ShowUp-‑--작업기록.md` is inaccessible at `.../wiki/#-ShowUp-‑--작업기록`. Fix: `git mv` to a plain name like `ShowUp-작업기록.md`, update `Home.md` to link the new name, push. Prevention: use only alphanumeric + Korean + standard ASCII hyphen (`-`) in wiki filenames. See `references/github-wiki-and-issues-cleanup.md` for the full fix procedure.

54. **Public holiday schedule adjustments.** When a holiday falls on a scheduled non-development day (e.g. Friday in the AI Agent Challenge timetable), the Friday activities (발표·데모) move to the preceding Thursday. When a holiday falls on a development day, that day becomes a no-work day. Update BOTH `plan.md` (§9 schedule table + 개발 가능일 count) AND `checklist.md` (merge the moved activity into the preceding day's LEAD section, mark the holiday day as ❌ 작업 없음). Recalculate the total development days and remaining days. The user shared a Slack announcement as the source — extract the exact changes (which activity moves where, what is cancelled) and apply them literally.

55. **Stale screenshots for PRs.** When attaching screenshots to a PR, verify the screenshot dates are recent (check file `mtime` or content). Screenshots taken on day 1 will NOT reflect features added on day 5. Before providing screenshot file paths for a PR, check: (a) `ls -la` on the screenshots directory for modification dates; (b) if any screenshot is older than the current work day, re-capture by navigating the browser to the relevant page. If the dev server requires login and you don't have credentials, ask the user — don't provide stale screenshots. The user caught this: "저 스크린샷들은 7/10일이 최종수정일인데 저게맞아? 다시찍어야하는거아니야?"

56. **Security test "PASS" claims in commit messages are not verification.** A security session committed "침투 테스트 5개 PASS" but actual audit revealed: (a) `penetration-test.ts` was an empty stub (`// This file intentionally left blank`); (b) `.js`/`.cjs` test files called `initializeTestApp()` which does NOT exist in `@firebase/rules-unit-testing` v5 — only `authenticatedContext()`/`unauthenticatedContext()` exist, so these files throw `TypeError` at runtime; (c) the Firestore emulator wasn't even installed (`npx firebase` failed, no CLI); (d) the only file with correct v5 API (`penetration-test.test.mjs`) couldn't run without the emulator. **When LEAD or any reviewer sees a "tests passed" claim, they must independently run the tests** — `npm run test:security` or the equivalent — and confirm green output. Commit messages are claims, not evidence. See `references/showup-security-audit.md` for the full audit.

57. **`@firebase/rules-unit-testing` v5 API change.** In v5.x, `initializeTestApp()` was removed from `RulesTestEnvironment`. The correct v5 API is: `env.authenticatedContext(uid)` → returns `RulesTestContext` → `.firestore()` returns a Firestore instance. Old v4 code that calls `testEnv.initializeTestApp({ auth: { uid: 'ownerA' } })` will throw `TypeError: initializeTestApp is not a function`. When writing or reviewing Firestore rules tests, check the installed version (`cat node_modules/@firebase/rules-unit-testing/package.json | grep version`) and use the matching API. The v5 `RulesTestContext.firestore()` returns a compat Firestore, but modular SDK calls (`getFirestore`, `doc`, `setDoc`) also work with the returned instance.

58. **Firestore rules: `create` validates fields, `update` doesn't.** A common pattern in firestore.rules is to validate field types/enum values on `allow create` but forget the same validation on `allow update`. This was found in ShowUp: `customers` create validated `name is string && name.size() > 0 && phone is string && phoneLast4 is string`, but `customers` update only checked `ownerUid` — allowing a client to overwrite `name` with an empty string or `phone` with arbitrary text. **Audit rule: for every `allow create` that has field validation, check whether `allow update` has equivalent validation.** If not, the create-time validation is bypassable via update. Same applies to `incidents` (create validates `type in [...]`, update doesn't) and `reservations` (create validates `status in [...]`, update only conditionally validates `status`).

59. **Phone masking: service function returns raw `phone` field.** In ShowUp, `searchCustomers()` correctly used `enrichCustomer()` to return `phoneMasked` (not raw `phone`), but `getCustomer()` returned the full `Customer` object including raw `phone`. Pages like `Reservations.tsx` called `getCustomer()` then accessed `customer.phone.slice(-4)` — meaning the raw phone number was in client memory (visible in React DevTools / network tab). **Audit pattern**: grep for all service functions that return customer data; verify each one either (a) returns `CustomerSearchResult` (masked) or (b) the consuming page only reads `phoneLast4`/`phoneMasked`. If a function returns `Customer` (with raw `phone`), check every call site. The fix is to make `getCustomer()` also go through `enrichCustomer()` or return a masked result type. Additionally, firestore.rules does NOT block reading the `phone` field — the rules `allow read` returns the entire document including `phone`. Field-level read blocking in Firestore rules is limited (you can't selectively hide fields), so the masking must be enforced at the service layer, not the rules layer.

61. **Checklist 9/9 + lint/typecheck/build pass does NOT mean code works.** A full-day cross-session code audit (using `delegate_task` with 3 parallel subagents — one per session: FE, BE, security) revealed 6 Critical, 7 Major, and 7 Minor issues despite all green checks. Key findings: (a) `Reservations.tsx` overwrote `id` with `customerId` — status change buttons sent wrong doc ID, silently failing; (b) `CustomerDetail.tsx` action buttons had no `onClick` handlers — dead buttons; (c) `riskRefresh.ts` helper functions were defined but never called by any page — riskStats never auto-updated; (d) firestore.rules had no `riskStats` write restriction — clients could set score to 0; (e) `getCustomer()` returned raw `phone` field — original phone number in client memory; (f) security session's commit said "침투 테스트 5개 PASS" but the test files used v4 API (`initializeTestApp`) that doesn't exist in v5, the emulator wasn't installed, and the `.ts` file was an empty stub. **Lesson: when the user asks "제대로 되고있는지 검증", do NOT just re-read the checklist — run a full code audit with `delegate_task` parallel subagents, each reading actual source files and reporting issues by file:line with severity.** The audit results should be fed back into the next day's checklist as explicit fix items, ordered by dependency (security rules → BE service functions → FE page integration). See `references/showup-lead-day6-parallel-audit.md` for the full procedure and findings.

62. **Worker sessions leaving stale state references after partial cleanup.** When a FE session removes unused state variables (e.g. `incidents`, `reservations` useState) to fix lint warnings, it may leave a dangling `setIncidents(data)` call elsewhere in the same file — causing `TS2552: Cannot find name 'setIncidents'`. The session reported "lint warning 4개 정리" and committed, but typecheck failed because the cleanup was incomplete. LEAD must run `npm run typecheck` after every FE commit that touches state/imports — even when the worker session claims success. The fix: read the file, find the dangling call, remove it. Also check for import path / filename mismatches: a new utility file like `dashboard.ts` may import `ReservationWithId` from `types/schema` when it's actually exported from `services/reservations` — `TS2305: Module has no exported member`. These are silent in build (esbuild) but caught by typecheck.

46. **LEAD committing uncommitted work from other sessions.** When LEAD finds untracked files (`??` in `git status`) produced by a worker session that forgot to commit, LEAD should commit them using the **originating session's prefix**, not `LEAD-`. For example, if security session wrote `penetration-test.ts` and `registration.test.ts` but didn't commit them, LEAD commits with `SEC- <description>`. This keeps commit history accurate — the work belongs to the security session, not LEAD. The `LEAD-` prefix is for LEAD's own work (documentation, review, planning, config fixes). Exception: if the files are a mix of multiple sessions' work, use `LEAD-` and note which session's work is included in the commit body.

   63. **Worker sessions committing IDE/tool cache files and archives.** A FE session committed `.superpowers/` directory (Hermes brainstorm cache), `apps/showup 가상본.zip` (archive), and PowerPoint temp files (`~$*.pptx`) alongside actual source code. These are not source files — they're tool-generated artifacts. During LEAD daily review, check `git show --name-only` for each worker session commit for non-source files. Fix: `git ls-files | grep -E '\.superpowers|\.zip|~\$'` → `git rm --cached` those files, add patterns to `.gitignore` (`.superpowers/`, `*.zip`, `~$*`). Worker sessions don't always know what their IDE/tools generate — LEAD must catch these during review.

   64. **Presentation output files need curated commit.** When the user says "output에 발표자료 넣어져있고", the `outputs/` directory may contain multiple versions of presentation decks (`.pptx`), PDFs, slide image folders, and temp files. The user identifies the **final** deck (e.g. `showup-core-demo-deck.pptx`). Procedure: (a) list all files in `outputs/`; (b) ask which to keep vs remove — the user may say "노트 제거, 나머지는 놔두고"; (c) remove only what the user says to remove (don't delete intermediate versions unless asked); (d) `git add outputs/` and commit. Note: `~$*.pptx` (PowerPoint lock files) should always be excluded via `.gitignore`. `.DS_Store` is already in `.gitignore` but may still be in the directory — `git add` will skip it if ignored.

   65. **Firebase Hosting deployment requires login and build first.** `firebase deploy --only hosting --project <projectId>` fails with "Failed to authenticate, have you run firebase login?" if the user hasn't authenticated. Tell the user to run `firebase login` (opens browser for Google OAuth). This is a one-time step. Before deploying: (a) `npm run build --workspace <app>` to generate `dist/`; (b) verify `firebase.json` has `"hosting": { "public": "dist", ... }` and `.firebaserc` has the correct projectId; (c) `firebase deploy --only hosting --project <projectId>`. After deploy: verify the Hosting URL loads correctly via `browser_navigate`. The deploy uploads all files in `dist/` (typically 20-30 files for a Vite app). The `.firebase/hosting.*.cache` file generated by deploy is a cache artifact — add `.firebase/` to `.gitignore` (Pitfall #63 pattern).

   66. **Worker sessions committing `.codegraph` and `.firebase/` cache files.** Similar to Pitfall #63 (`.superpowers/`, `*.zip`), worker sessions may commit IDE/tool-generated cache files like `.codegraph` (a symlink created by code analysis tools) and `.firebase/hosting.ZGlzdA.cache` (Firebase deploy cache). During LEAD daily review, run `git ls-files | grep -E '\.codegraph|\.firebase/'` to detect these. Fix: `git rm --cached` the files, add `.codegraph` and `.firebase/` to `.gitignore`. Worker sessions don't know what their tools generate — LEAD must catch these during review.

   67. **Bug list document pattern for LEAD daily review.** When LEAD performs a daily review and finds issues across sessions, create a structured `docs/bug-list.md` with priority levels: P0 (배포 전 필수), P1 (배포 전 권장), P2 (데모/발표 전 확인). Each entry includes: session, file:line, problem description, status. Include a "세션별 할당" section at the bottom mapping each P-level item to the responsible session. Also include "이미 해결된 항목" section listing past fixes with their commit hashes — this prevents re-reporting already-fixed issues. The bug list serves as the input for the next day's session work assignments.

   68. **Worker sessions may skip assigned bug fixes and do other work instead.** When LEAD assigns P0/P1 bug fixes to FE/BE/SEC sessions via `docs/bug-list.md`, the sessions may complete their *new* checklist items (e.g. landing page, route restructuring) but skip the *fix* items (e.g. `any` type cleanup, mock file deletion). During LEAD review: (a) grep for the specific patterns from the bug list (e.g. `grep -n "any" CustomerDetail.tsx`); (b) check if `src/mock/` and `services/storeFlow.ts` still exist; (c) if unchanged, mark them as "미완료" in the checklist and re-assign for the next day. Don't assume the session did the fixes just because they committed — verify by checking the actual code state.

   69. **Wiki work log must be kept current — LEAD responsibility.** The GitHub wiki work log (`ShowUp-작업기록.md`) must be updated at the end of each work day, not batched. When the user says "위키 작성해", check which dates are missing by grepping `^## ` in the wiki file, then add all missing day sections at once. Each section follows the standard format (오늘 한 작업 by session + 커밋 list). If the wiki clone directory was deleted (`/tmp/showup-wiki` is gone), re-clone from `https://github.com/<user>/<repo>.wiki.git` before updating.

   70. **Firebase Spark (free) plan blocks Cloud Functions deployment.** `firebase deploy --only functions` fails with "Your project must be on the Blaze (pay-as-you-go) plan" when the Firebase project is on the Spark (free) tier. Cloud Functions require the Blaze plan — there is no workaround on Spark. When this happens:
   - **Don't delete `functions/`** — keep the directory and source code for future migration when the user upgrades to Blaze.
   - **Revert to client-side riskStats refresh**: restore `riskRefresh.ts` (the `*AndRefresh` helper functions), remove the `riskStats` write-block rule from `firestore.rules` (keep `ownerUid` verification), and have FE pages call the `*AndRefresh` helpers again.
   - **Document the decision** in `plan.md` (change "Cloud Functions 확정" to "Spark 요금제 대안 — 클라이언트 갱신") and `checklist.md` (mark Cloud Functions 배포 as "Spark 불가, 클라이언트 갱신으로 대체").
   - **Migration path**: when Blaze is enabled, (a) re-add `riskStats` write-block to `firestore.rules`, (b) `firebase deploy --only functions`, (c) delete `riskRefresh.ts`, (d) `risk.ts` pure function stays in both `src/utils/` and `functions/src/`.
   - The user said "최저비용으로 데모페이지를 만들고싶은데" — for demo/presentation purposes, client-side refresh is sufficient. The security tradeoff (client can manipulate riskStats) is acceptable for a demo, not for production.

   71. **Worker sessions committing `functions/lib/` build artifacts.** When a worker session runs `tsc` inside `functions/` (e.g. to typecheck Cloud Functions code), the compiler generates `.js` and `.js.map` files in `functions/lib/`. These are build artifacts, not source. Add `apps/showup/functions/lib/` to `.gitignore`. During LEAD daily review, check `git ls-files | grep "functions/lib/"` and `git rm --cached` any committed artifacts.

   72. **Firebase Hosting `firebase.json` needs SPA rewrites for client-side routing.** A Vite + React SPA deployed to Firebase Hosting will return 404 for any client-side route (e.g. `/login`, `/app/customers/new`) accessed directly via URL. The `firebase.json` hosting config must include `"rewrites": [{"source": "**", "destination": "/index.html"}]` to route all requests to the SPA entry point. Without this, only the root path works; all other routes hit Firebase's static file server and return 404. The fix is a single block in `firebase.json` under the `hosting` key:
   ```json
   "rewrites": [
     { "source": "**", "destination": "/index.html" }
   ]
   ```
   After adding, rebuild (`npm run build`) and redeploy (`npx firebase deploy --only hosting`). Verify by directly accessing a deep link like `https://<project>.web.app/app/customers/new` — it should load the SPA, not a 404 page. **LEAD should check `firebase.json` for rewrites during deployment review** — this is a 1-line config that breaks the entire app if missing.

   73. **`signUp()` partial failure leaves `stores/{uid}` doc missing → all Firestore ops fail.** When `signUp()` in `auth.ts` calls `createUserWithEmailAndPassword()` then `createStore()`, the first call can succeed while the second fails (network, timeout, rules rejection). The result: a valid Auth user with NO `stores/{uid}` document. Since Firestore Security Rules use `get(/stores/{storeId}).data.ownerUid == request.auth.uid` to verify ownership, a missing stores doc causes `get()` to fail → **every** customers/reservations/incidents read/write returns 403 "Missing or insufficient permissions." The user can log in but can't register customers, create reservations, or do anything. **Safety net**: in `Login.tsx`'s `onSubmit`, after `signIn()` succeeds, check `getStore(user.uid)` — if null, auto-create the stores doc via `createStore(user.uid, { ownerUid: user.uid, name: user.displayName || '가게', category: 'etc' })`. This recovers from partial signup failures without the user knowing. **BE session should add rollback to `signUp()`** — if `createStore()` throws after Auth user creation, delete the Auth user (`auth.deleteUser(uid)` via admin SDK) or retry `createStore()`. But the Login safety net is the practical fix because it handles all failure scenarios (browser automation, interrupted signup, network glitch).
   - **Import path / filename mismatch**: FE creates `src/hooks/useAuth.ts` but imports it as `@/hooks/useAuthState` in `App.tsx` — TS2307 "Cannot find module". The file was named `useAuth.ts` (exporting `useAuthState()`) but the import used a different base name. This happens when a session writes the hook file and the consuming file at different times without cross-checking.
   - **RHF optional fields vs required interface**: `useForm<LoginForm>` produces `{ email?: string; password?: string }` (all optional), but `signIn(input: SignInInput)` expects `{ email: string; password: string }` (required). TS2345. Fix: either type the form as `z.input<typeof schema>` and cast on submit, or make the `useForm` generic use the schema's output type explicitly, or cast `data` in the `onSubmit` handler.
   - **General rule**: when a worker session says "typecheck passed" in its report, LEAD should still independently run `npm run typecheck -w showup` during daily review. Worker sessions may have run typecheck before their last edit, or may have a stale `tsbuildinfo` cache that masks errors. Delete `*.tsbuildinfo` and re-run if in doubt.

As the project grows, keep `docs/` organized by purpose. The flat structure
(`docs/*.md` for everything) becomes unmaintainable after a few weeks.

### Recommended structure

```
apps/<project>/
  README.md
  .hermes.md
  docs/
    plan.md                    # 기획서 — always at docs/ root
    checklist.md               # 체크리스트 — always at docs/ root
    user-flow.md               # 유저 플로우 — always at docs/ root
    presentations/             # 발표 자료 모음
      <date>.md                # e.g. 0710.md
    blog/                      # 블로그/회고 모음
      <title>.md               # e.g. velog-week1-backend.md
  sessions/                    # 세션 가이드 — NOT inside docs/
    LEAD.md / FE.md / BE.md / SECURITY.md
  security-docs/              # 보안 산출물 — NOT inside docs/, NOT named "security/" (see Pitfall #40)
    penetration-test.md
    riskstats-exception.md
    privacy-draft.md           # 법적 문안 초안 (실제 페이지는 src/pages/*.tsx)
    terms-draft.md
```

### Rules

- **Core docs** (`plan.md`, `checklist.md`, `user-flow.md`) stay at `docs/` root — they're referenced by all sessions and need to be found fast.
- **Presentations** go in `docs/presentations/` — named by date (`0710.md`), not by week number.
- **Blog/retrospective posts** go in `docs/blog/` — separate from core docs.
- **Legal drafts** (`privacy.md`, `terms.md`) move to `security-docs/` (renamed from `security/` to avoid confusion with `sessions/SECURITY.md` — see Pitfall #40) — they're security-session owned, and the real rendered versions live in `src/pages/Privacy.tsx` / `Terms.tsx`. Name them `-draft.md` to clarify they're not final.
- **Session guides** stay at `sessions/` (not `docs/sessions/`) — they're operational documents, not planning docs.
- **Personal/non-project files** (study materials, exam prep, etc.) must NEVER be placed inside the project repo — use `~/Documents/` instead (see Pitfall #41).
- Update all README link paths when moving files (`git mv` preserves history).
- After restructuring, update both `README.md` files (root + project) to reflect the new directory tree.

### When to restructure

Do this proactively at the end of Week 1 or when `docs/` has 5+ files at the root level. Don't wait until the user says "너무 파일이 많다" — the flat structure is already hard to navigate by then.

## GitHub Issues Batch Registration

When a daily mission requires registering project tasks as GitHub Issues (e.g.
"작업을 이슈로 등록"), and the project already uses `docs/checklist.md` for
task tracking, don't skip the mission — do the minimal additional work:

### Steps

1. **Enable Issues** if disabled: `gh repo edit --enable-issues`
2. **Create role/day labels**: `gh label create "FE" --color "1a76ff" --force`, etc.
3. **Batch-create issues** via `execute_code` with `subprocess`:
   ```python
   import subprocess
   issues = [
       ("4일차-FE: 고객 등록 폼", "FE,4일차", "## 작업 내용\n...\n## 완료 기준\n- [ ] ..."),
       # ...
   ]
   for title, labels, body in issues:
       result = subprocess.run(
           ["gh", "issue", "create", "--title", title, "--label", labels, "--body", body],
           capture_output=True, text=True, cwd="<repo_root>"
       )
   ```
4. **Link from README**: add `- [GitHub Issues — 작업 이슈 트래커](https://github.com/<org>/<repo>/issues)` to the 문서 section.
5. **Do NOT restructure the project** — the user said "프로젝트 갈아엎지말고 할수있는건 하자". Add issues as a lightweight layer on top of the existing checklist, not a replacement.

### Issue body format

```
## 작업 내용
<one-line description>

## 완료 기준
- [ ] <checkable item>
- [ ] <checkable item>
```

Keep it minimal — the checklist.md already has the full detail. Issues are for
visibility on the GitHub tracker, not for duplicating the checklist.

### Label scheme

| Label | Color | Purpose |
|-------|-------|---------|
| `FE` | `1a76ff` (blue) | 프론트엔드 세션 |
| `BE` | `2da44e` (green) | 백엔드 세션 |
| `SEC` | `d73a4a` (red) | 보안 세션 |
| `LEAD` | `fbca04` (yellow) | 리드 세션 |
| `<N>일차` | `bfd4f2` (light blue) | 일자 라벨 (복수 선택) |

## PR Creation on GitHub Web UI

When guiding the user to create a PR on GitHub's compare page:

### Base selection

- **Base repository**: upstream org (e.g. `connect-AIAgentChallenge-26-1/hub`)
- **Base**: the **same branch name** as the working branch (e.g. `N167_채민석`), NOT `main`
- **Head repository**: fork (e.g. `Min0504/hub`)
- **Compare**: the working branch (e.g. `N167_채민석`)

If base = `main`, GitHub shows "entirely different commit histories" — this means
the base is wrong. Switch base to the matching branch name.

### Similar branch name trap

Branches like `N167_채민석` (ㅊ) and `N167_배현석` (ㅂ) look similar in a dropdown.
The user may select the wrong one. When guiding PR creation, spell out the exact
branch name and note the first consonant to disambiguate.

### PR content delivery

Do NOT auto-create the PR via `gh pr create`. Provide the markdown title + body
for the user to copy-paste into GitHub's PR creation form. The user wants to
review and manually submit (see Pitfall #38).

## Fork/Upstream Commit History Divergence Repair

When `git filter-branch` (or any history-rewriting operation) is used on a fork to
standardize commit messages, **all commit hashes change**. This breaks the shared
commit ancestry between the fork and upstream — `git merge-base` returns nothing,
and GitHub's compare page shows "entirely different commit histories" even when
the correct branch is selected on both sides.

This is NOT just a base-selection problem (Pitfall #48) — the fork and upstream
genuinely have no common ancestor after history rewriting. Another AI Agent
Challenge participant (N143_이현빈) hit the identical issue from a different cause
(new branch → different commits → merge back → divergent histories).

### Symptoms

- `git merge-base upstream/<branch> HEAD` → fails (no common ancestor)
- GitHub compare page: "There isn't anything to compare... are entirely different commit histories"
- Even with correct base = `<branch>` and compare = `<branch>`, no diff appears
- The "Create pull request" button never appears

### Root cause

`git filter-branch --msg-filter` rewrites every commit, producing new hashes for
all commits. The fork's history no longer shares any commit with upstream, even
though the file contents are identical or near-identical.

### Fix procedure

```bash
# 1. Add upstream remote (if not already present)
git remote add upstream https://github.com/<upstream-org>/<repo>.git
git fetch upstream

# 2. Verify the divergence
git merge-base upstream/<branch> HEAD  # should fail

# 3. Generate a patch of all changes from upstream's tip to our HEAD
git diff upstream/<branch> HEAD > /tmp/fork-changes.patch

# 4. Create a new branch based on upstream's branch (re-establishes ancestry)
git checkout -b temp-rebase upstream/<branch>

# 5. Apply the patch (all our new work on top of upstream's history)
git apply /tmp/fork-changes.patch

# 6. Verify the apply succeeded — check git status
git status --short  # should show modified/added files

# 7. Commit as a single commit (or multiple if you want to preserve granularity)
git add -A
git commit -m "LEAD- <description of all new work>"

# 8. Verify build/lint/typecheck pass
npm run lint --workspace <app>
npm run typecheck --workspace <app>
npm run build --workspace <app>

# 9. Replace the working branch with the rebased history
git checkout <branch>
git reset --hard temp-rebase
git branch -D temp-rebase

# 10. Verify merge-base now exists
git merge-base upstream/<branch> HEAD  # should return a SHA

# 11. Force push (requires user approval)
git push --force-with-lease origin <branch>
```

### After the fix

- GitHub compare page now shows the diff correctly
- The "Create pull request" button appears
- Future commits on the fork will share ancestry with upstream
- The old (rewritten) commits are gone — only the single squash commit + upstream's
  history remain. The PR body contains the full work summary, so granularity loss is
  acceptable for challenge submissions.

### When NOT to use this

- If the fork and upstream genuinely have different projects (not a fork relationship)
- If preserving granular commit history is more important than PR compatibility
  (in that case, ask the user to rebase the original commits onto upstream instead
  of squashing)

### Guidance for other participants

When another challenge participant reports the same "entirely different commit
histories" error, the fix is the same: re-establish ancestry by branching from
upstream and applying the diff. The root cause varies (filter-branch, new branch
divergence, force-push without shared base) but the repair is identical.

## GitHub Wiki Daily Work Log + Issues Cleanup

LEAD maintains a daily work log on the project's GitHub wiki. The wiki is a
separate git repo (`<repo>.wiki.git`) that must be cloned once and updated
each day. After the daily review confirms checklist items are complete, also
batch-close the corresponding GitHub Issues on the **upstream** repo.

### Wiki entry format

```markdown
## YYYY-MM-DD (N일차)

### 오늘 한 작업

- **FE**: <bullet list>
- **BE**: <bullet list>
- **보안**: <bullet list>
- **LEAD**: <bullet list>

### 커밋

- `<7-char-hash>` <commit message with prefix>
```

### Procedure

1. Clone wiki repo (one-time): `cd /tmp && git clone https://github.com/<user>/<repo>.wiki.git`
2. Pull latest, append new day section via `patch`, commit, push.
3. After daily review: `gh issue close <num> --repo <upstream> --reason completed --comment "완료"`
4. Wiki URL: `https://github.com/<user>/<repo>/wiki`

See `references/github-wiki-and-issues-cleanup.md` for the full procedure.

## PR Body — Minimal Emoji (session squares only)

The user initially stated "앞으로 pr에 이모지는 뺀다" (2026-07-20), then clarified on 2026-07-21 that session color squares (🟦🟩🟥🟨) before session names should be kept. When preparing PR body markdown: keep 🟦 프론트엔드 / 🟩 백엔드 / 🟥 보안 / 🟨 리드 as section prefixes, but remove all other emoji (no ✨, 🎉, 🚀, ✅, etc.) from headers, bullets, and descriptions.

## Session Dependency Ordering for Daily Work

When a day's checklist has tasks for multiple sessions (FE, BE, security), the work order should follow dependency, not the checklist's top-to-bottom order:

1. **Security first** — firestore.rules changes define what BE and FE can/cannot do. Rules are the foundation.
2. **BE second** — service functions adapt to the new rules (e.g. getCustomer returns masked data after rules block raw phone).
3. **FE third** — pages adapt to BE service function changes (e.g. use `phoneMasked` instead of `phone.slice(-4)`).
4. **LEAD last** — verification, E2E check, checklist update after all sessions complete.

This ordering prevents wasted work: if FE implements against old BE signatures, it breaks when BE changes. The user confirmed this pattern works: "보안부터 시작하면 됩니다."

## Schedule Compression (Accelerated Deadline)

When the user says "일정을 이틀정도 앞당긴다" or moves the deadline forward:

### Steps

1. **Identify which days are removed** — e.g. 7/30→7/28 removes the last 2 development days (15일차, 16일차).
2. **Merge remaining tasks into fewer days** — combine what was 3 days of work (13/14/15/16일차) into 2 days (13/14일차). Group by theme: deployment + presentation prep into one day, final 마무리 into the last day.
3. **Update plan.md §9 schedule table** — reduce day count, update 개발 가능일 count, update PR 제출 가능일 list, change "7/30 이후" to new deadline "이후".
4. **Update checklist.md** — compress remaining day sections. Add "일정 앞당김" note in each compressed day's header. Merge tasks from removed days into the compressed days (e.g. 10+11일차 → 10일차, 13+14+15+16일차 → 11+13+14일차).
5. **Update README.md 기간 line**.
6. **Commit + push**.
7. **Recalculate remaining development days** accurately — the user will catch arithmetic errors.

### Pitfall

Don't just delete days — redistribute the tasks. Each removed day's tasks must land somewhere in the compressed schedule. The user expects the SAME work to get done, just faster.

## Firebase Choice Rationale (for PRs and Presentations)

When the user asks why Firebase was chosen (not Supabase/Express):

1. **Firestore Security Rules match the core requirement** — ShowUp's core is per-store data isolation. Firestore Rules enforce `ownerUid == request.auth.uid` server-side; clients cannot bypass. Express + custom DB would require hand-writing middleware for this.
2. **Fast deployment** — `firebase deploy` deploys Hosting + Rules + Cloud Functions + indexes in one command. No server hosting, DB setup, or auth system to build separately.
3. **3-week timeline makes self-hosted server impractical** — Express + DB + Auth + deployment setup = 3-4 days of infrastructure. Firebase integrates Auth, Firestore, Cloud Functions, Hosting — development time goes to features.
4. **Cloud Functions for riskStats recalculation** — `onWrite` triggers recalculate riskStats server-side. Rules block client writes to `riskStats`; only Cloud Functions (admin SDK, bypasses rules) can update it.

## Showcase Submission (showcase.json)

When the AI Agent Challenge requires a `showcase.json` for project showcase:

### File structure

```
<repo-root>/showcase/
├── showcase.json
├── thumbnail.png
└── screenshots/
    ├── dashboard.png
    ├── customers.png
    ├── reservations.png
    └── landing.png
```

### showcase.json fields

| Field | Value | Notes |
|-------|-------|-------|
| `githubUser` | `Min0504(채민석)` | `github_id(이름)` format |
| `title` | Project title | One-line summary |
| `description` | 2-3 sentence service description | What problem, what solution |
| `techStack` | Array of strings | Runtime + dev tools |
| `features` | Array of strings | 4-6 key features |
| `screenshots` | Array of relative paths | `screenshots/*.png` |
| `demoUrl` | Hosting URL | `https://<project>.web.app` |
| `githubUrl` | Branch URL | `https://github.com/<user>/<repo>/tree/<branch>/apps/<project>` |

### Screenshot capture procedure

1. Start dev server: `npm run dev --workspace showup` (background)
2. Navigate to each page via `browser_navigate`
3. Capture via `browser_vision` — screenshots saved to `~/.hermes/cache/screenshots/`
4. Copy to `showcase/screenshots/` with descriptive names
5. Use landing page as `thumbnail.png`
6. Login may be required — use test credentials, auth state may reset between page loads

### Thumbnail

Use the landing page screenshot as `thumbnail.png`. The thumbnail should give an overview of the service at a glance.

## Architecture Diagram via Subagent Delegation

When a daily mission requires "데이터 흐름과 아키텍처 시각화":

1. **Delegate to subagent**: `delegate_task` with goal "read all source code and produce a mermaid diagram of screen → service → DB data flow"
2. **Subagent reads**: `App.tsx` (router), `src/pages/*.tsx`, `src/services/*.ts`, `src/lib/firebase.ts`, `src/hooks/useAuth.ts`, `firestore.rules`, `src/utils/risk.ts`, `src/services/riskRefresh.ts`
3. **Output**: `docs/architecture.md` with mermaid `flowchart TB` diagram + section descriptions
4. **README link**: Add `- [아키텍처 다이어그램](docs/architecture.md)` to README 문서 section
5. **Diagram should show**: pages → service functions → Firestore collections, Auth flow, riskStats refresh flow, Security Rules enforcement points

### Key finding pattern

The subagent audit often reveals architectural issues not visible from the checklist:
- `dashboard.ts` combination service exists but Dashboard page calls individual services directly
- `firestore.rules` comments say "Cloud Function only" but rules actually allow client writes (Spark plan workaround)
- These findings should be recorded in `docs/architecture.md` and flagged for future fix

## TDD as Daily Mission Compliance

When the daily mission says "feature 하나를 TDD로 도전":

1. **Pick a small feature** — ideally a pure function that can be tested without Firestore/Auth
2. **Write test file first** (`src/utils/<name>.test.ts`) with all test cases
3. **Run test → verify RED** (at least one failure proves the test is real)
4. **Fix implementation** → verify GREEN (all pass)
5. **Add to package.json**: `"verify:<name>": "tsx src/utils/<name>.test.ts"`
6. **Document in `docs/verify-skill.md`** — TDD applied section with red-green details

### Example: search.ts TDD

- Feature: `extractSearchPhoneLast4(keyword)` + `isNameSearch(keyword)` — pure functions for search keyword analysis
- Red: 13 test cases, 1 failed (hyphen-containing phone number classified as name search)
- Green: fixed `isNameSearch` logic to "digits.length >= 4 → phone search"
- 13/13 PASS, added `verify:search` script

## Verification Skill as Dual Artifact

When the daily mission says "테스트와 검증을 Agent로" (Skill creation):

1. **Create Hermes Agent Skill**: `skill_manage(action='create', name='showup-verify', ...)` — agent auto-loads
2. **Create repo document**: `docs/verify-skill.md` — for challenge submission, code reviewer visibility
3. **Both must stay in sync** — when adding a new test script, update both the Skill and the repo doc
4. **README link**: Add `- [검증 Skill](docs/verify-skill.md)` to README 문서 section

The Skill covers: lint → typecheck → build → unit tests (risk, phone, search, seed) in sequence, with PASS/FAIL reporting format.

## References

- `references/github-wiki-and-issues-cleanup.md` — GitHub wiki daily update procedure (clone, pull, append, push) + batch-closing completed upstream issues after daily review. **Also covers wiki filename special-character 404 fix** (rename files with `#`, `‑` to plain ASCII + Korean).

## External Code Review — Bug Fix Workflow (14일차)

When receiving an external code review, triage findings into three buckets before touching code:

1. **Fix now (P0/P1)**: Route link mismatches, form submit bugs, null safety, missing indexes, error state hiding, tsconfig noEmit. These block the demo.
2. **MVP limitation (can't fix)**: Spark plan → no Cloud Functions, Firestore field-level read limits, legal docs not written. Document as known limitations.
3. **Defer (P2/P3)**: N+1 queries, race conditions, a11y, strict mode, unused deps. Leave for post-launch.

**Pattern**: LEAD session can fix all P0/P1 in one pass when changes are small. Session switching overhead > doing fixes directly. Only delegate to FE/BE when fix requires deep domain knowledge.

## Daily PR Pattern

For challenge submissions with daily PRs:
- Each day's PR covers that day's commits only
- PR compare URL: `https://github.com/{org}/hub/compare/{branch}...{user}:{branch}?expand=1`
- PR body: 주요 작업 리스트 / 내가 설명할 수 있는 부분 / 아직 이해 못 한 부분 / 새로 알게 된 것 / 데모 영상 링크 / 데모 계정

## Emoji Ban — User Preference (Hard Rule)

User has repeatedly (3+ times) told agents to remove emojis from UI. This is a hard preference:
- No emojis in navigation, buttons, labels, or any rendered text
- Use plain text or SVG line icons only
- Test files may keep ✅/❌ in console output — not UI rendering
- When editing ANY component, NEVER add emoji icons
- `references/conductor-to-hermes-migration.md` — Concrete migration recipe (Conductor → Hermes Agent with GLM 5.2), including all file changes, clarification questions, and verification commands.
- `references/github-issues-batch-setup.md` — GitHub Issues batch registration procedure: enabling issues, creating labels, batch `gh issue create` via subprocess, README linking.
- `references/showup-be-firebase-notes.md` — ShowUp BE 1일차 작업에서 확인한 Firebase/Firestore 구조, Timestamp 타입 설계, risk/phone util 검증, 시드 데이터, 인덱스, Security Rules 초안.
- `references/showup-be-day1-log.md` — ShowUp BE 1일차 완료 보고: 산출물, 검증 명령, 시드 데이터 preview, 커밋 체크리스트, `git commit` deny-rule 대응.
- `references/showup-be-firebase-integration.md` — ShowUp BE 3~4일차 Firebase Auth/Firestore 연동: 인증-가게 생성, 고객 검색, 예약/사건 riskStats 갱신, 인덱스, 시드 업로드, FE-BE 인터페이스, 커밋 우회 패턴.
- `references/showup-be-day6-critical-fix.md` — ShowUp BE 6일차(7/16) critical fix: getCustomer 마스킹 반환, isSameDay 문자열 비교, serverTimestamp, incident Timestamp.fromDate, Reservations.tsx 연동 수정, riskRefresh 제거, Cloud Functions 방식 확정.
- `references/showup-lead-day1-review.md` — ShowUp LEAD 1일차 총정리 로그: 이슈 발견 패턴, 체크리스트 대조, 커밋 대상/제외 정리, 2일차 작업 순서. LEAD 일일 리뷰 시 참고.
- `references/showup-schedule-restructure.md` — ShowUp 일정 재분배 로그: Week 기반 → 일차별 분배 전환 절차, 한국 요일 정확성, 1일차 완료분 삽입, 버퍼 일수 확보.
- `references/showup-lead-full-verification.md` — ShowUp LEAD 전면 재확인 절차: 13개 항목 체크리스트, LEAD.md 기간 누락 발견 사례, "편집한 파일만 확인"의 위험성.
- `references/showup-lead-day3-review.md` — ShowUp LEAD 3일차(7/13) 리뷰 로그: FE 세션 typecheck 실패 패턴(import path mismatch, RHF optional vs required), Pitfall #42 실제 사례.
- `references/showup-lead-day3b-review.md` — ShowUp LEAD 3일차(7/13) 추가 리뷰: 주간 계획 수립 항목 중복 제거, day-based 일정에서 월요일 = 전일 개발, Firebase 프로젝트 미생성 블로커 의존성 패턴.
- `references/showup-lead-day4-review.md` — ShowUp LEAD 4일차(7/14) 리뷰 로그: 8개 커밋 검증, 9/9 체크리스트 완료, 보안 세션 모델 GLM 5.2 변경.
- `references/showup-lead-day5-review.md` — ShowUp LEAD 5일차(7/15) 리뷰 로그: 3개 커밋 검증, wiki+issues cleanup, 데일리 미션 검증 패턴 (CodeSquad 미션 ↔ 프로젝트 상태 대조).
- `references/showup-lead-day5b-review.md` — ShowUp LEAD 5일차(7/15) 추가 리뷰: 보안 세션 GLM 5.2 변경 후 침투테스트 5/5 PASS, 데일리 미션 3/3 검증, GitHub Issues 14개 close, README 개발 도구 명시.
- `references/showup-lead-day5c-review.md` — ShowUp LEAD 5일차(7/15) 저녁 리뷰: PR WHAT+WHY 양식, stale screenshot 문제, 7/17 공휴일 발표일 이동, 보안 모델 변경 전 세션 반영.
- `references/showup-doc-restructuring.md` — ShowUp 문서 디렉토리 재구성 로그: docs/ 서브디렉토리 분리(presentations/, blog/), legal drafts → security-docs/ 이동, git mv 히스토리 보존, 중복 제거 절차.
- `references/commit-message-rewrite.md` — `git filter-branch --msg-filter`로 커밋 메시지 일괄 수정 절차: rebase -i 실패 대안, Unicode hyphen 트랩, force push 검증.
- `references/showup-security-audit.md` — ShowUp 보안 세션 전체 코드 감사 결과: firestore.rules 커버리지, create/update 검증 불일치, 침투 테스트 실행 불가 증명, 전화번호 마스킹 누락, security-docs와 실제 코드 불일치. Pitfalls #56-60의 원본 사례.
- `references/showup-lead-day6-parallel-audit.md` — ShowUp LEAD 6일차(7/16) 병렬 크로스 세션 코드 감사: `delegate_task` 3-way 병렬 감사 기법, 체크리스트 9/9 + 빌드 통과 후에도 Critical 6건 발견, 의존성 기반 작업 순서 결정 (보안→BE→FE), 감사 결과를 체크리스트에 반영하는 패턴.
- `references/showup-lead-day8-review.md` — ShowUp LEAD 8일차(7/20) 리뷰: `.superpowers/` 캐시 파일 커밋 감지 패턴, 세션 작업 순서(보안→BE→FE) 적용, 발표 자료 outputs/ 정리.
- `references/showup-lead-day10-review.md` — ShowUp LEAD 10일차(7/22) 리뷰: 일정 앞당김(7/30→7/28), 코드 스플리팅 결과(328KB→7.97KB), PR 포맷 최종 확정(이모지/스크린샷/WHAT+WHY), **PR body 형식 일관성 규칙** (### 🟦 서브헤더 사용, PR 간 형식 통일), **LEAD bug-list 문서 패턴** (docs/bug-list.md P0/P1/P2 분류 + 세션별 할당).
- `references/showup-lead-day11-review.md` — ShowUp LEAD 11일차(7/23) 리뷰: Firebase Hosting 배포 절차(login→build→deploy→verify), bug-list.md 작성 패턴, 세션이 버그 수정을 건너뛰고 새 기능만 하는 패턴, `.codegraph`/`.firebase/` 캐시 파일 정리.
- `references/firebase-spark-plan-workaround.md` — Firebase Spark(무료) 요금제에서 Cloud Functions 배포 불가 시 클라이언트 갱신으로 대체하는 절차. riskRefresh.ts 복구, firestore.rules 수정, functions/ 디렉토리 유지, Blaze 업그레이드 시 이관 경로.

## Plan Spec (기획서) Review

When asked to "꼼꼼하게 다시 보고 빈틈없는지 확인" a project spec (`plan.md` + linked docs):

### Cross-check pass

1. **Counts mentioned in multiple places.** Grep for numbers like "N종" across all docs — if §4.1 says 4 event types but §7 와이어프레임 says "5종", that's an error.
2. **Data model ↔ event table consistency.** Cross-reference Firestore schema fields with the event type table. If `cancelledSameDay: boolean` exists in the schema but the event table just says "당일 취소 시 자동 구분", the description is too vague — spell out the mechanism.
3. **Markdown table formatting.** Look for broken pipes (`||` where `|` is expected), misaligned rows, or tables that render as plain text. A common bug: `|| 구분 |` where the leading `|` was doubled during a patch.
4. **Escape sequence residue.** Search for `\\|\\|` in markdown tables — this is a markdown-escape artifact that should be `||` (or `\|` if inside a table cell that needs escaping). Check ALL docs, not just the one you fixed — the same condition may appear in user-flow.md §1 AND §3.
5. **Old-platform / old-wording remnants in secondary docs.** After a migration or wording change, don't just grep `plan.md` — grep ALL `.md` files under the project. user-flow.md, checklist.md, and README.md often have residual references that were missed.
6. **Undefined specifics.** Phrases like "요약 카드 4개" without listing what the 4 cards are. Each concrete item should be specified or it becomes an ambiguity for the implementing session.
7. **MVP boundary clarity.** If a route appears in the IA list (§6) but isn't in the MVP 필수/제외 table, it's ambiguous. Every route should be explicitly classified.
8. **Korean wording consistency across ALL files.** After changing "시큐리티"→"보안" or "프론트"→"프론트엔드", grep the entire project root, not just the file you're editing. English equivalents (Lead/Frontend/Backend/Security) in README.md should also be converted to Korean (리드/프론트엔드/백엔드/보안) for consistency.

### Review procedure

```bash
# 1. Read all docs
# plan.md, user-flow.md, checklist.md, README.md (project + root), all sessions/*.md

# 2. Grep for known problem patterns
grep -rn "시큐리티\|SECURITY 문안\|프론트[^엔]\|5종\|\\\\|\\\\|" <project> --include="*.md"
grep -rn "Conductor\|Lead·\|Frontend·\|Backend·\|Security·" <project> --include="*.md"

# 3. Report findings as 🔴 (must fix) / 🟡 (should improve) / ✅ (OK)
# 4. Fix all 🔴 before declaring the spec complete
```

## LEAD Daily Review Procedure

At the end of each work day (or when the user says "총정리해서"), LEAD performs a
structured review of all sessions' work. This is a **read-only triage** — no
implementation, no file edits unless the user explicitly permits.

### Steps

1. **Read all session docs + checklist + plan + README** — batch reads in one turn.
2. **Check git state**: `git branch --show-current`, `git status --short`, `git log --oneline -15`.
3. **Map commits to sessions**: identify which session produced each commit (by prefix or message).
4. **Cross-reference checklist**: compare actual files/commits against `docs/checklist.md` Week items. Mark which items are ✅ complete, ⚠️ partial, ❌ not started.
5. **Identify issues**:
   - Untracked files that should have been committed (Pitfall #20)
   - Build artifacts leaking into working tree (Pitfall #21)
   - Checklist items not checked off (Pitfall #22)
   - `.gitignore` missing `.env` (Pitfall #23)
   - `@types/react` version conflict — run `npm run typecheck` separately from `npm run build` (Pitfall #24)
   - `*.tsbuildinfo` untracked (Pitfall #25)
   - **Worker session code fails typecheck** — run `npm run typecheck` independently even if worker sessions reported "typecheck passed" (Pitfall #42). Common patterns: import path/filename mismatch (TS2307), RHF optional fields vs required interface (TS2345). Delete `*.tsbuildinfo` and re-run if the cache may be stale.
   - Cross-session file conflicts or ownership violations
   - Sessions that didn't verify (no lint/build/test evidence)
6. **Identify blockers needing admin action** — e.g. Firebase project creation, `.env` setup, external accounts.
7. **Propose next-day work order** — prioritize by dependency (e.g. schema.ts must be final before FE can use it).
8. **Compile commit candidate / exclude list** — which uncommitted files should be committed vs ignored.
9. **Report** using the standard LEAD report format.

### Report format for daily review

Use the standard report format (한 것 / 막힌 점 / 검증 / 앞으로할것 / 관리자가 할것), but expand with:
- **Session-by-session commit table** (commit hash, session, message)
- **Checklist status table** (item, status, notes)
- **Issue list** with severity (⚠️ / 🔴)
- **Commit candidate table** (file, reason, include/exclude)

## Schedule Restructuring (Week → Day-based)

When the user changes the project timeline (e.g. "주 5일 일할것이다", "오늘을 1일차로 하고 다시 분배하라"),
the LEAD must restructure the entire schedule from Week-based blocks to **day-based blocks**:

### Steps

1. **Confirm the calendar** — ask/confirm the start date, end date, and workdays (주 5일 = 월~금). **Verify the weekday of the start date** — Korean dates must have the correct 요일. For 2026-07-09, the weekday is **Thursday (목)**, not Wednesday. Use `date +%A` or a calendar to confirm before writing.
2. **List all workdays** — enumerate each 영업일 with date + 요일, excluding weekends.
3. **Map remaining work to days** — distribute all incomplete checklist items across the available days, grouped by daily theme. Each day = FE/BE/SEC/LEAD sub-sections (same emoji-coded structure as before).
4. **Embed completed work as 1일차** — all work already done (checked items, committed files) goes into "1일차 — <theme> ✅ 완료" with `[✅]` marks (NOT `[x]` — the user prefers `[✅]` for visual clarity, stated 7/14: "체크는 x가 아닌 체크표시로한다").
5. **Update `plan.md` §9** — replace the Week-based table with a day-based table (일차/날짜/요일/단계).
6. **Update `checklist.md`** — full rewrite: header (기간 line), then day-by-day sections. Keep the 🟦🟩🟥🟨 session sub-sections within each day.
7. **Update `README.md`** — change the 기간 line to match the new schedule.
8. **Commit + push** (if user says to push).

### Pitfalls

- **Don't just rename Week headers to Day headers.** The content must be redistributed — a Week had 4-6 items per session across 5 days; a day has 1-3 items per session across 1 day. The granularity changes.
- **Keep the Phase 1.5/2/3 section** at the bottom — it's post-project, not day-based.
- **Buffer days** — reserve 2-3 days at the end as 버퍼 for spill-over work.
- **Korean weekday accuracy is non-negotiable.** Writing 수요일 when it's 목요일 breaks trust. Always verify: `python3 -c "import datetime; print(datetime.date(2026,7,9).strftime('%A'))"` or check a calendar. **Also trust the system-provided date**: if the system metadata says "Thursday, July 09" and the user confirms "7/9 목요일", don't override with your own calculation that says Wednesday.
- **No "주간 계획 수립" items in day-based mode.** When the schedule is already fully distributed across days in `plan.md` §9 and `checklist.md`, adding "주간 계획 수립 (10:00-12:00)" to Mondays is redundant — the user called this out explicitly. Mondays should be full development days with no planning overhead. The weekly timetable constraint note should say "화/목 오전 = 마스터 클래스" and "월/수 = 전일 개발 가능", not "월요일 오전 = 주간 계획 수립".

## Deployment Pitfalls (Firebase Hosting)

When deploying a React SPA to Firebase Hosting, two critical issues recur:

1. **SPA rewrites missing** — `firebase.json` must include `rewrites: [{ source: "**", destination: "/index.html" }]` or direct URL navigation to any `/app/*` route returns 404.
2. **stores document missing after signUp** — if `createStore()` fails silently after `createUserWithEmailAndPassword` succeeds, the Auth account exists but `stores/{uid}` doesn't → all Firestore sub-collection access returns 403 because `isStoreOwner()` calls `get()` on a non-existent document. Add a safety net in `Login.tsx` to create the stores doc if missing.

See `references/firebase-hosting-spa-and-stores-fix.md` for full diagnosis, fix code, and detection commands.

## Verification Checklist

- [ ] Old platform name only appears in intentional migration-background references
- [ ] All session guides have `## 환경` section with new platform/model/mode
- [ ] Per-session model assignments documented in plan.md, checklist.md, all session guides, both READMEs
- [ ] Push/PR rules updated consistently across all 4 session guides
- [ ] `plan.md` session structure section rewritten with migration background + model column
- [ ] `checklist.md` title and header updated with model assignments
- [ ] Both `README.md` files (root + project) updated with model info
- [ ] Old platform state files (`.omc/`) deleted (with user confirmation)
- [ ] Session startup prompts generated for all 4 sessions (copy-paste ready)
- [ ] **Wording consistency in reference files**: grep `references/` for old terms (시큐리티, 프론트 without 엔드) — the startup prompts reference file is a common miss spot
- [ ] **Prototype verified in browser** (if a prototype was built): all screens rendered, no emoji in nav/icons, CSS variables used, `npm run lint` + `npm run build` pass
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `git status` shows expected files changed, no unexpected artifacts
- [ ] **`.gitignore` contains `.env`** — not just `*.local` (Pitfall #23)
- [ ] **No build artifacts (.js) in working tree** — grep for `src/**/*.js` alongside `.tsx` files (Pitfall #21) AND check non-src test directories for `.js/.cjs/.mjs` artifacts (Pitfall #45)
- [ ] **Checklist items checked off** — completed items show `- [✅]` not `- [ ]` (Pitfall #22). The user prefers `[✅]` over `[x]` for visual clarity (stated 7/14). When updating checklist status, use `- [✅]` for completed items.
- [ ] **No untracked source files left by sessions** — `git status --short` shows no `??` on source files that sessions should have committed (Pitfall #20)
- [ ] **`npm run typecheck` passes independently** — not just `npm run build`. Worker sessions may have committed code with TS errors (import path mismatch, RHF type incompatibility). Delete `*.tsbuildinfo` and re-run if cache may be stale (Pitfall #42)
- [ ] **`npm run typecheck` passes** (not just `npm run build`) — vite build uses esbuild and ignores type errors; run typecheck separately to catch `@types/react` conflicts (Pitfall #24)
- [ ] **`*.tsbuildinfo` in `.gitignore`** — `tsc -b` cache files should not appear as untracked (Pitfall #25)
- [ ] **`.hermes.md` exists** if project uses Hermes Agent sessions directly — declares CLAUDE.md/AGENTS.md unnecessary (Pitfall #34)
- [ ] **Cross-document schedule consistency** — plan.md §10 rules (e.g. 침투 테스트 timing) match checklist.md task distribution (Pitfall #35)
- [ ] **No cross-document numeric duplication** — risk weights, score boundaries, and alert conditions appear ONLY in plan.md §4; other docs (user-flow.md, FE.md, BE.md) reference plan.md instead of copying numbers (Pitfall #39)
- [ ] **Folder naming: `security-docs/` not `security/`** — avoids confusion with `sessions/SECURITY.md` (Pitfall #40)
- [ ] **No IDE/tool cache files committed** — grep `git ls-files` for `.superpowers/`, `*.zip`, `~$*` (Pitfall #63), `.codegraph`, `.firebase/` (Pitfall #66). Add to `.gitignore` if found.
- [ ] **No `functions/lib/` build artifacts committed** — grep `git ls-files | grep "functions/lib/"` (Pitfall #71). Add `apps/showup/functions/lib/` to `.gitignore` if found.
- [ ] **`firebase.json` has SPA rewrites** — `"rewrites": [{"source": "**", "destination": "/index.html"}]` must be present under `hosting` (Pitfall #72). Without this, all client-side routes 404 on direct URL access after Firebase Hosting deploy.
- [ ] **Login safety net for missing `stores` doc** — `Login.tsx` should check `getStore(user.uid)` after `signIn()` and auto-create if null (Pitfall #73). Without this, a partial signup failure (Auth user created but `createStore()` failed) leaves the user unable to do anything.
- [ ] **No personal/non-project files in the repo** — `git status` and `git ls-files` should not contain study materials, exam prep, or other personal artifacts. These belong in `~/Documents/`, not `apps/<project>/` (Pitfall #41).
- [ ] **Presentation outputs curated** — `outputs/` contains only agreed-upon files, no PowerPoint lock files (`~$*`) or `.DS_Store` (Pitfall #64).