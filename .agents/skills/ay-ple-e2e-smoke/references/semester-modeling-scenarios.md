# Focused SemesterModeling Fixture Scenarios

Use one of these named scenarios when broader SemesterModeling coverage is
useful. They are not required in the default representative smoke.

## `assignment-correction`

Select:

```text
major/data-structures/과제-2-안내.md
major/data-structures/과제-2-정정.md
```

Both sources describe the same `과제 2: 이진 탐색 트리 구현`. The later
notice supersedes only its deadline: reconcile one Assignment whose current
deadline is `2026-05-10 18:00`, while preserving the original notice as
evidence instead of creating two assignments.

## `project-follow-up`

Select:

```text
liberal-arts/problem-solving-writing/기말-프로젝트-안내.md
liberal-arts/problem-solving-writing/LMS-공지-기말-프로젝트.md
```

The first notice leaves the deadline unknown. The later authoritative LMS
notice resolves it to `2026-06-12 17:00`. Reconcile one project Assignment and
do not preserve the earlier unknown deadline as a conflicting current value.

## `unsupported-preview`

Select:

```text
major/computer-systems/07주차-강의자료.pptx
```

The source must remain selectable even when the shell cannot render an inline
document preview.

## `low-confidence-note`

Select:

```text
inbox/메모.txt
```

The note is hearsay and explicitly says its deadline is unverified. AY should
surface that ambiguity or decline to replace a more authoritative fact; it must
not silently treat the note as a confirmed deadline.
