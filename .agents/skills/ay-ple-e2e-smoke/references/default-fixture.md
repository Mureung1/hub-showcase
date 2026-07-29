# Default AY-PLE Dogfood Smoke

Use this scenario for the repository's representative product smoke.

## Development roots

Resolve these sibling paths from the AY-PLE hub:

```text
immutable seed:                    ../fixtures/year-2-semester-1
generated, observable dogfood SemesterWorkspace:
                                   ../workspace/year-2-semester-1
built-in Product Skill catalog:    skills
```

The seed is synthetic and non-personal. Never mutate it during a smoke. The
generated target is replaceable only through the start-time reconcile contract
below; retain it after the run so the user can inspect and reopen the actual
dogfood result.

Use this semester identity:

```text
year-level:        2
term-key:          first-semester
term-display-name: 1학기
```

## Start-time reconcile

Inspect the generated target from the hub. If it exists, verify its exact Git
root, remotes, complete status including ignored files, local E2E ownership
markers, `workspace-state.json`, tracked roster, Bootstrap scaffold, explicit
material baseline, installed Product Skills, and current seed bytes.

For a material or installed Skill mismatch, make a three-way judgment using the
bytes recorded by its Bootstrap checkpoint:

- upstream and workspace bytes equal: current;
- workspace still equals its Bootstrap copy while upstream changed: upstream
  drift;
- workspace differs from its Bootstrap copy: workspace-side or ambiguous
  drift, even when upstream also changed.

| Classification | Meaning | Action |
| --- | --- | --- |
| `ready` | Exact active generated Git root; exact local E2E ownership markers; no remote; no staged, unstaged, untracked, or ignored file; expected envelope identity; empty snapshot; current seed and Product Skill bytes; intact scaffold; no unexpected tracked path | Reuse it without staging. |
| `reseedable` | Missing target, an exact raw seed left before Bootstrap, a clean prior applied snapshot whose only product change is reviewed state, or clean upstream drift while the workspace copy still equals its Bootstrap copy | Build a fresh sibling staging workspace, then cut over only after Bootstrap and readiness succeed. |
| `conflict` | Dirty, ignored, or unexpected file; foreign root or remote; missing replacement ownership marker; identity or scaffold mismatch; workspace-side or ambiguous material/Skill drift; unexpected commit or tracked path | Fail closed and preserve every byte. |

The Git-local replacement markers are a destructive-action safety proof only.
They are not a Skill version, hash manifest, freshness signal, or user
SemesterWorkspace contract. `activate` records them in a newly generated
target. Treat a pre-helper target without them as a replacement conflict. Adopt
one only after the user explicitly confirms that exact root is generated
dogfood and Codex independently verifies every other reconcile fact.

For that one-time adoption only, record the exact current `HEAD`, then run:

```bash
node --import tsx \
  .agents/skills/ay-ple-e2e-smoke/scripts/reconcile-dogfood-workspace.mts \
  adopt \
  --fixture-root "<canonical absolute ../fixtures/year-2-semester-1>" \
  --workspace-root "<canonical absolute ../workspace/year-2-semester-1>" \
  --expected-head "<exact verified target HEAD>" \
  --confirm-replace "<canonical absolute ../workspace/year-2-semester-1>"
```

Require an `adopted` result for that exact root and `HEAD`, then inspect again.
This records only Git-local replacement ownership. It does not establish
freshness or turn a conflict into `reseedable`.

For `reseedable`, run `stage` with canonical absolute paths:

```bash
node --import tsx \
  .agents/skills/ay-ple-e2e-smoke/scripts/reconcile-dogfood-workspace.mts \
  stage \
  --fixture-root "<canonical absolute ../fixtures/year-2-semester-1>" \
  --workspace-root "<canonical absolute ../workspace/year-2-semester-1>" \
  --confirm-replace "<canonical absolute ../workspace/year-2-semester-1>"
```

The command validates only explicit paths, a non-empty regular-file seed, exact
confirmation, and replacement ownership. It creates a sibling `stagingRoot`
and returns sorted `baselinePaths` plus `expectedTargetFingerprint`; the
existing target remains preserved.

Follow `$semester-workspace-init` against `stagingRoot` with every returned
baseline path. A staging root is `staging-ready` when every `ready` fact holds
for that sibling root except the final active-target path and local replacement
markers, which activation owns. Record its exact `HEAD` only after that
inspection. If Bootstrap or staging readiness fails, leave the prior target
active and report the staging path as failure evidence. Then activate it:

```bash
node --import tsx \
  .agents/skills/ay-ple-e2e-smoke/scripts/reconcile-dogfood-workspace.mts \
  activate \
  --fixture-root "<canonical absolute ../fixtures/year-2-semester-1>" \
  --workspace-root "<canonical absolute ../workspace/year-2-semester-1>" \
  --staging-root "<exact stagingRoot returned by stage>" \
  --expected-target-fingerprint "<exact fingerprint returned by stage>" \
  --expected-staging-head "<exact HEAD recorded after staging-ready inspection>" \
  --confirm-replace "<canonical absolute ../workspace/year-2-semester-1>"
```

`activate` rechecks the prior target and prepared staging root, then performs
the bounded swap. It does not interpret SemesterModel, Product Skill freshness,
or Bootstrap policy. This is a Codex development harness for one known
generated target, not a refresh or migration mechanism for user
SemesterWorkspaces.

## Browser shell and Chat

Expect the active semester label `2학년 1학기`.

Send this read-only message:

```text
현재 workspace-state.json에 기록된 학기와 snapshot 상태를 읽기 전용으로 한 문단으로 요약해줘. 파일을 수정하거나 Review를 요청하지 마.
```

The response should describe the active semester and current snapshot without
changing files or opening Review. Exact wording is not part of the smoke.

## Sources and SemesterModeling

Use exactly these workspace-relative PDFs:

```text
liberal-arts/indian-mythology-and-philosophy/중간고사 시험범위.pdf
liberal-arts/indian-mythology-and-philosophy/기말고사 시험범위.pdf
```

Both must appear once, be selectable, and render as PDF previews.

The SemesterModeling proposal should reconcile the selected midterm and
final-exam facts into the current SemesterModel snapshot:

- The midterm is on `2026-04-21`. Its time is explicitly pending a later LMS
  notice and must remain unknown rather than being invented.
- The midterm covers chapters 2 through 6, pages 21 through 137.
- The final is on `2026-06-16` from `10:30` through `11:20` in room `B201`.
- The final covers weeks 9 through 14.

The seed does not state course grading weights. A proposal must not infer them.
Judge the Review against the source contents and existing
`workspace-state.json`; do not prescribe an exact serialization shape.

Accept the Review. PASS requires that AY applies only the reviewed snapshot
facts, preserves the envelope and source bytes, creates a meaningful clean Git
checkpoint, and leaves AY-PLE usable. Retain the workspace, App process, and
Browser tab after the run; the next smoke reconciles them at its start.
