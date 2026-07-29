# SemesterModeling Fixture Smoke

Use this scenario to exercise AY-PLE's first representative
`model_semester` product path.

## Target

Resolve the sibling fixture from the AY-PLE hub:

```text
../workspace/year-2-semester-1
```

The resolved absolute path is the Skill's workspace input. Do not recreate,
bootstrap, clean, or commit this fixture as part of the smoke run.

## Sources

Select exactly these workspace-relative files:

```text
liberal-arts/indian-mythology-and-philosophy/중간고사 시험범위.pdf
liberal-arts/indian-mythology-and-philosophy/기말고사 시험범위.pdf
```

Both must appear once in the Browser source explorer, be selectable as PDFs,
and remain regular files inside the prepared workspace.

## Expected semantic boundary

The proposal should reconcile the selected midterm and final-exam scope facts
for the relevant academic context into the current SemesterModel snapshot.
Judge the actual proposal against the source contents and existing
`workspace-state.json`; do not prescribe an exact serialization shape.

PASS requires:

- the live Browser dispatches one `model_semester` action containing both
  selected files;
- the actual `ay-ple-semester-modeling` Skill reaches a pending
  `propose_state_patch` Review;
- the proposal is limited to facts supported by these sources and preserves
  missing or unclear facts as uncertainty;
- the Runtime and pending Review survive the 330-second lifecycle soak; and
- default rejection leaves `workspace-state.json` and the fixture's complete
  Git status unchanged.

A transcript-only answer, a fabricated exam date, a Review for unrelated
course data, or a Runtime that enters recovery before settlement is RED.
