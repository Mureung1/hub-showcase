# Default AY-PLE Fixture Smoke

Use this scenario for the repository's representative product smoke.

## Target

Resolve this sibling fixture from the AY-PLE hub:

```text
../workspace/year-2-semester-1
```

Do not recreate, bootstrap, clean, or commit it during the smoke.

The workspace is prepared from the synthetic, non-personal source fixture at
`../fixtures/year-2-semester-1`. The source files intentionally cover known,
unknown, superseded, and low-confidence academic facts. Judge proposals
semantically against the contracts below rather than requiring a fixed
SemesterModel serialization.

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

The fixture does not state course grading weights. A proposal must not infer
them. Judge the Review against the source contents and existing
`workspace-state.json`; do not prescribe an exact serialization shape.

In the default `review-only` run, reject the proposal. PASS requires that the
Review resolves, the App remains usable, and the original
`workspace-state.json`, `HEAD`, and complete Git status are preserved.
