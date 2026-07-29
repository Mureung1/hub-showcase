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

Run from the hub with all paths canonical and absolute:

```bash
node --import tsx \
  .agents/skills/ay-ple-e2e-smoke/scripts/reconcile-dogfood-workspace.mts \
  inspect \
  --fixture-root "<canonical absolute ../fixtures/year-2-semester-1>" \
  --workspace-root "<canonical absolute ../workspace/year-2-semester-1>" \
  --built-in-skill-catalog-root "<canonical absolute skills>" \
  --year-level 2 \
  --term-key first-semester \
  --term-display-name "1학기"
```

Interpret the result:

| Classification | Meaning | Action |
| --- | --- | --- |
| `ready` | Exact generated Git root, clean status, empty baseline snapshot, current seed materials, current Product Skill catalog, and expected scaffold | Reuse it. |
| `reseedable` | Missing target, an interrupted raw seed copy, a clean prior applied snapshot, or clean seed/catalog drift | Stop only a matching AY-PLE process, run `reseed`, then follow `$semester-workspace-init` with every returned `baselinePaths` entry. Inspect again and require `ready`. |
| `conflict` | Dirty or untracked state, foreign or unrecognized Git history, unexpected committed paths, managed scaffold drift, or workspace identity mismatch | Fail closed and preserve every byte. |

For `reseed`, repeat the same arguments, replace `inspect` with `reseed`, and
append:

```text
--confirm-replace "<canonical absolute ../workspace/year-2-semester-1>"
```

The helper copies only regular seed files. It deliberately leaves the target
unprepared; `$semester-workspace-init` remains the owner of Git, identity,
Product Skills, Interaction MCP config, and checkpoints. This is a Codex
development harness for one known generated target, not a refresh or migration
mechanism for user SemesterWorkspaces.

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
